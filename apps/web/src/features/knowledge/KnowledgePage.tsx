import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers, Wrench } from "lucide-react";
import { api } from "../../lib/api-client";
import "./knowledge.css";

type Template = { id: string; nameZh: string; nameEn?: string };
type Task = { id: string; nameZh: string; templates: Template[] };
type Model = { id: string; name: string; tasks: Task[] };
type Skill = { id: string; nameZh: string; category: string };

export function KnowledgePage() {
  const modelsQuery = useQuery({ queryKey: ["models"], queryFn: () => api<Model[]>("/models") });
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: () => api<{ data: Skill[] }>("/skills").then((response) => response.data) });
  return <main className="knowledge-page">
    <header className="page-header"><div><h1>模板与技能</h1><span className="count">内置知识与本地扩展</span></div></header>
    <section className="knowledge-section"><header><Layers size={16} /><h2>模型任务与模板</h2></header>{modelsQuery.isLoading ? <div className="state-panel"><p>正在加载模板...</p></div> : null}{modelsQuery.data?.map((model) => <div className="model-knowledge" key={model.id}><h3>{model.name}</h3><div className="task-list">{model.tasks.map((task) => <article key={task.id}><strong>{task.nameZh}</strong><div>{task.templates.map((template) => <span key={template.id}>{template.nameZh}</span>)}</div></article>)}</div></div>)}</section>
    <section className="knowledge-section"><header><Wrench size={16} /><h2>Prompt Skills</h2></header>{skillsQuery.isLoading ? <div className="state-panel"><p>正在加载 Skill...</p></div> : null}{skillsQuery.data?.length ? <div className="skill-catalog">{skillsQuery.data.map((skill) => <article key={skill.id}><BookOpen size={15} /><div><h3>{skill.nameZh}</h3><p>{skill.category}</p></div></article>)}</div> : <div className="state-panel"><p>尚未创建自定义 Skill。</p></div>}</section>
  </main>;
}
