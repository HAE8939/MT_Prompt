import { spawn } from "node:child_process";
import type { CredentialStore } from "./credential-store.js";

const nativeSource = String.raw`
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class PromptVaultCredentials {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct Credential { public UInt32 Flags, Type; public string TargetName, Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public UInt32 CredentialBlobSize; public IntPtr CredentialBlob; public UInt32 Persist, AttributeCount; public IntPtr Attributes; public string TargetAlias, UserName; }
  [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredWrite(ref Credential credential, UInt32 flags);
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredRead(string target, UInt32 type, UInt32 flags, out IntPtr credential);
  [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredDelete(string target, UInt32 type, UInt32 flags);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr buffer);
  public static void Set(string target, string secret) { byte[] bytes=Encoding.Unicode.GetBytes(secret); IntPtr blob=Marshal.AllocCoTaskMem(bytes.Length); try { Marshal.Copy(bytes,0,blob,bytes.Length); var c=new Credential { Type=1, TargetName=target, CredentialBlobSize=(UInt32)bytes.Length, CredentialBlob=blob, Persist=2, UserName="PromptVault" }; if(!CredWrite(ref c,0)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()); } finally { Marshal.FreeCoTaskMem(blob); } }
  public static string Get(string target) { IntPtr ptr; if(!CredRead(target,1,0,out ptr)) { if(Marshal.GetLastWin32Error()==1168) return null; throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()); } try { var c=(Credential)Marshal.PtrToStructure(ptr,typeof(Credential)); byte[] bytes=new byte[c.CredentialBlobSize]; Marshal.Copy(c.CredentialBlob,bytes,0,bytes.Length); return Encoding.Unicode.GetString(bytes); } finally { CredFree(ptr); } }
  public static void Remove(string target) { if(!CredDelete(target,1,0) && Marshal.GetLastWin32Error()!=1168) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()); }
}`;

export class WindowsCredentialStore implements CredentialStore {
  async set(service: string, secret: string) { await invoke("Set", service, secret); }
  async get(service: string) { return invoke("Get", service); }
  async remove(service: string) { await invoke("Remove", service); }
}

function invoke(action: "Set" | "Get" | "Remove", target: string, secret = ""): Promise<string | null> {
  const script = `Add-Type -TypeDefinition $env:PROMPTVAULT_NATIVE_SOURCE; $value=[PromptVaultCredentials]::${action}($env:PROMPTVAULT_TARGET${action === "Set" ? ",$env:PROMPTVAULT_SECRET" : ""}); if ($null -ne $value) { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($value)) }`;
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      env: { ...process.env, PROMPTVAULT_NATIVE_SOURCE: nativeSource, PROMPTVAULT_TARGET: `PromptVault/${target}`, PROMPTVAULT_SECRET: secret },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Windows Credential Manager operation failed: ${stderr.trim()}`));
      const encoded = stdout.trim();
      resolve(encoded ? Buffer.from(encoded, "base64").toString("utf8") : null);
    });
  });
}
