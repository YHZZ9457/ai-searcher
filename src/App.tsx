import { useState, useEffect, useRef } from "react";
import { Settings, Loader2, X, Save, GripVertical, Pin, PinOff, Search, Sun, Moon, Monitor, HelpCircle, Copy, Check, ChevronDown, Brain, Plus } from "lucide-react";
import OpenAI from "openai";
import ReactMarkdown from "react-markdown";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/window";

const appWindow = getCurrentWebviewWindow();

const SYSTEM_PROMPTS = {
  default: "You are a capable assistant. You need to answer questions concisely.",
  minimalist: "Your function is to distill every query to its absolute essence. Provide the single most critical piece of information as a declarative statement. Maximum signal, zero noise. Your response should rarely exceed one sentence.",
  custom: ""
};

const DEFAULT_CONFIG = {
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o",
  openaiModel: "gpt-4o",
  ollamaModel: "",
  alwaysOnTop: true,
  theme: "light",
  promptMode: "default",
  customPrompt: "",
  scale: "medium"
};

const HEADER_HEIGHT = 84;
const EXPANDED_HEIGHT = 600;

export default function App() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reasoningCopied, setReasoningCopied] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [imageData, setImageData] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageData(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("ai_searcher_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    return DEFAULT_CONFIG;
  });

  const handleCopy = async (text: string, type: 'answer' | 'reasoning') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'answer') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setReasoningCopied(true);
        setTimeout(() => setReasoningCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const fetchOllamaModels = async () => {
    try {
      const baseUrl = config.baseUrl.replace(/\/v1\/?$/, '');
      const response = await fetch(`${baseUrl}/api/tags`);
      const data = await response.json();
      const models = data.models.map((m: any) => m.name);
      setOllamaModels(models);
    } catch (err) {
      console.error("Failed to fetch Ollama models:", err);
    }
  };

  useEffect(() => {
    if (config.provider === 'ollama' && showSettings) {
      fetchOllamaModels();
    }
  }, [config.provider, showSettings, config.baseUrl]);

  // 主题控制
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (theme: string) => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme(config.theme);

    if (config.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [config.theme]);

  // 窗口尺寸控制
  useEffect(() => {
    const adjustSize = async () => {
      try {
        const isExpanded = showResult || showSettings;
        const factor = await appWindow.scaleFactor();
        const scaleMultiplier = config.scale === 'small' ? 0.8 : config.scale === 'large' ? 1.2 : 1.0;
        
        if (isExpanded) {
          const contentHeight = containerRef.current?.scrollHeight || HEADER_HEIGHT;
          const targetHeight = Math.min(contentHeight + 16, EXPANDED_HEIGHT) * scaleMultiplier;
          
          const physicalSize = await appWindow.innerSize();
          const logicalWidth = physicalSize.width / factor;

          await appWindow.setMaxSize(new LogicalSize(2000, 2000));
          await appWindow.setSize(new LogicalSize(logicalWidth, targetHeight));
          await appWindow.setMinSize(new LogicalSize(400, HEADER_HEIGHT * scaleMultiplier));
        } else {
          const physicalSize = await appWindow.innerSize();
          const logicalWidth = physicalSize.width / factor;
          
          await appWindow.setMinSize(new LogicalSize(400, HEADER_HEIGHT * scaleMultiplier));
          await appWindow.setMaxSize(new LogicalSize(2000, HEADER_HEIGHT * scaleMultiplier));
          await appWindow.setSize(new LogicalSize(logicalWidth, HEADER_HEIGHT * scaleMultiplier));
        }
      } catch (err) {
        console.error("Window resize error:", err);
      }
    };
    adjustSize();
  }, [showResult, showSettings, answer, reasoning, showReasoning, config.scale]);

  useEffect(() => {
    appWindow.setAlwaysOnTop(config.alwaysOnTop).catch(() => {});
  }, [config.alwaysOnTop]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 本地快捷键监听
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      // Alt+Q: 清空并选中 (唯一本地热键)
      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setQuery("");
        setAnswer("");
        setImageData(null);
        setShowResult(false);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, []);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    if (config.provider !== 'ollama' && !config.apiKey) {
      setAnswer("⚠️ 请先在设置中填写 API Key！");
      setShowResult(true);
      return;
    }

    setLoading(true);
    setAnswer("");
    setReasoning("");
    setShowReasoning(false);
    setShowResult(true); 
    setShowSettings(false);

    const systemPrompt = config.promptMode === "custom" ? config.customPrompt : (config.promptMode === "minimalist" ? SYSTEM_PROMPTS.minimalist : SYSTEM_PROMPTS.default);
    
    try {
      const openai = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey || "ollama", dangerouslyAllowBrowser: true });
      
      const messages: any[] = [{ role: "system", content: systemPrompt }];
      if (imageData) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: query },
            { type: "image_url", image_url: { url: imageData } }
          ]
        });
      } else {
        messages.push({ role: "user", content: query });
      }

      const stream = await openai.chat.completions.create({ model: config.model, messages, stream: true });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta as any;
        const content = delta?.content || "";
        const reasoningContent = delta?.reasoning_content || delta?.reasoning || "";
        
        if (reasoningContent) {
          setReasoning((prev) => prev + reasoningContent);
        }
        if (content) {
          setAnswer((prev) => prev + content);
        }
      }
    } catch (error: any) { 
      setAnswer("❌ 对话出错: " + (error.message || "未知原因")); 
    } finally { 
      setLoading(false); 
    }
  };

  const saveSettings = () => {
    localStorage.setItem("ai_searcher_config", JSON.stringify(config));
    setShowSettings(false);
  };

  return (
    <div ref={containerRef} style={{ zoom: config.scale === 'small' ? 0.8 : config.scale === 'large' ? 1.2 : 1.0 }} className="w-full flex flex-col items-center bg-transparent select-none overflow-hidden font-sans p-2">
      {/* 搜索框 */}
      <div className="w-full h-[64px] flex items-stretch bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all shrink-0 border-2 border-zinc-300 dark:border-zinc-700 shadow-sm">
        <div data-tauri-drag-region className="w-[3.2rem] flex items-center justify-center cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors flex-shrink-0">
          <GripVertical size={22} strokeWidth={1.5} data-tauri-drag-region />
        </div>
        <div className="flex items-center text-zinc-400 pl-1 flex-shrink-0">
          <Search size={22} strokeWidth={1.5} />
        </div>
        {imageData && (
          <div className="flex items-center px-2 flex-shrink-0">
            <div className="relative group/img">
              <img 
                src={imageData} 
                alt="preview" 
                className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
              />
              <button 
                onClick={() => setImageData(null)}
                className="absolute -top-1 -right-1 bg-zinc-800 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center ml-1 min-w-0 h-full">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { handleAsk(); } }}
            onPaste={handlePaste}
            placeholder="有什么可以帮您？"
            className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 text-[1.25rem] text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 font-light px-2 leading-[1.2] placeholder:leading-normal"
          />
        </div>
        <div className="flex items-center gap-1 pr-4 flex-shrink-0">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button 
            onClick={() => imageInputRef.current?.click()}
            className={`p-2 rounded-xl transition-all ${imageData ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            title="发送图片"
          >
            <Plus size={20} />
          </button>
          {loading ? (
            <Loader2 className="animate-spin text-blue-500 mx-2" size={20} />
          ) : query ? (
            <button onClick={() => { setQuery(""); setAnswer(""); setShowResult(false); setImageData(null); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
               <X size={16} />
            </button>
          ) : null}
          <button onClick={() => { setShowSettings(!showSettings); setShowResult(false); }} className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-blue-500 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mt-4 w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] p-7 flex flex-col space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 overflow-y-auto max-h-[520px] shrink-0 custom-scrollbar border-2 border-zinc-300 dark:border-zinc-700 shadow-2xl relative">
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-5">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400">
                <Settings size={22} />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">偏好设置</h2>
                <div 
                  className="relative cursor-help text-zinc-300 hover:text-blue-500 transition-colors"
                  onMouseEnter={() => setShowHelp(true)}
                  onMouseLeave={() => setShowHelp(false)}
                >
                  <HelpCircle size={18} strokeWidth={2} />
                  {showHelp && (
                    <div className="absolute top-[140%] left-[-10px] w-56 bg-zinc-900/95 text-white text-[12px] p-4 rounded-2xl shadow-2xl backdrop-blur-md z-50 border border-white/10 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                      <div className="space-y-3 font-normal">
                        <div className="flex justify-between items-center gap-4 border-b border-white/10 pb-2">
                          <span className="text-zinc-400">唤醒/隐藏</span>
                          <span className="bg-zinc-800 px-2 py-0.5 rounded font-mono text-[11px] text-blue-400 border border-white/5">Alt + Space</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-zinc-400">清空并重置</span>
                          <span className="bg-zinc-800 px-2 py-0.5 rounded font-mono text-[11px] text-blue-400 border border-white/5">Alt + Q</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setConfig({...config, alwaysOnTop: !config.alwaysOnTop})} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95 ${config.alwaysOnTop ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20' : 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700'}`}
              >
                {config.alwaysOnTop ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
                <span className="font-semibold">窗口置顶</span>
              </button>
              <button 
                onClick={saveSettings} 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-blue-500/25 text-xs font-bold"
              >
                <Save size={14} /> 保存应用
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {/* 核心配置板块 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* AI 提供商 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Brain size={14} className="text-blue-500" />
                  <label className="text-[12px] text-zinc-400 uppercase font-bold tracking-widest">服务提供商</label>
                </div>
                <div className="flex gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  {[
                    { id: 'openai', label: 'OpenAI 兼容' },
                    { id: 'ollama', label: 'Ollama' }
                  ].map(p => (
                    <button key={p.id} onClick={() => {
                      const isOllama = p.id === 'ollama';
                      const newBaseUrl = isOllama ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1';
                      const newModel = isOllama ? (config.ollamaModel || 'llama3') : (config.openaiModel || 'gpt-4o');
                      setConfig({
                        ...config, 
                        provider: p.id, 
                        baseUrl: newBaseUrl,
                        model: newModel
                      });
                    }} className={`flex-1 py-2.5 rounded-xl text-xs transition-all active:scale-95 ${config.provider === p.id ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-md font-bold' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* 界面主题 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Sun size={14} className="text-orange-500" />
                  <label className="text-[12px] text-zinc-400 uppercase font-bold tracking-widest">视觉主题</label>
                </div>
                <div className="flex gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  {[
                    { id: 'light', icon: Sun, label: '浅色' },
                    { id: 'dark', icon: Moon, label: '深色' },
                    { id: 'system', icon: Monitor, label: '系统' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setConfig({...config, theme: t.id})} className={`flex-1 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${config.theme === t.id ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-md font-bold' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium'}`}>
                      <t.icon size={13} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* 接口连接板块 */}
            <div className="p-6 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-[2rem] space-y-6 border border-zinc-100 dark:border-zinc-800/50 shadow-inner">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[12px] text-zinc-500 font-bold ml-1 flex items-center gap-2">
                    接口地址
                  </label>
                  <input 
                    type="text" 
                    value={config.baseUrl} 
                    onChange={e => setConfig({...config, baseUrl: e.target.value})} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none p-3.5 rounded-2xl text-[14px] transition-all focus:ring-4 focus:ring-blue-500/5 dark:text-zinc-200 placeholder:text-zinc-400" 
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[12px] text-zinc-500 font-bold ml-1 flex items-center gap-2">
                    模型名称
                  </label>
                  {config.provider === 'ollama' && ollamaModels.length > 0 ? (
                    <div className="relative group">
                      <select 
                        value={config.ollamaModel} 
                        onChange={e => setConfig({...config, ollamaModel: e.target.value, model: e.target.value})}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none p-3.5 pr-10 rounded-2xl text-[14px] appearance-none cursor-pointer focus:border-blue-500 transition-all dark:text-zinc-200"
                      >
                        {!config.ollamaModel && <option value="">选择模型...</option>}
                        {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={config.provider === 'openai' ? config.openaiModel : config.model} 
                      onChange={e => {
                        const val = e.target.value;
                        if (config.provider === 'openai') {
                          setConfig({...config, openaiModel: val, model: val});
                        } else {
                          setConfig({...config, model: val});
                        }
                      }} 
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 outline-none p-3.5 rounded-2xl text-[14px] transition-all dark:text-zinc-200 placeholder:text-zinc-400" 
                      placeholder="gpt-4o"
                    />
                  )}
                </div>
              </div>

              {config.provider !== 'ollama' && (
                <div className="space-y-2.5">
                  <label className="text-[12px] text-zinc-500 font-bold ml-1 flex items-center gap-2">
                    API 密钥
                  </label>
                  <input 
                    type="password" 
                    value={config.apiKey} 
                    onChange={e => setConfig({...config, apiKey: e.target.value})} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 outline-none p-3.5 rounded-2xl text-[14px] font-mono tracking-wider transition-all dark:text-zinc-200 placeholder:text-zinc-400" 
                    placeholder="sk-..." 
                  />
                </div>
              )}
            </div>

            {/* 提示词模式板块 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Search size={14} className="text-zinc-400" />
                <label className="text-[12px] text-zinc-400 uppercase font-bold tracking-widest">回答风格</label>
              </div>
              <div className="flex gap-3 p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                {[
                  { id: 'default', label: '全能助手', desc: '平衡且准确' },
                  { id: 'minimalist', label: '极简主义', desc: '一句话精华' },
                  { id: 'custom', label: '自定义', desc: '自由定义' }
                ].map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setConfig({...config, promptMode: m.id})} 
                    className={`flex-1 py-3 px-2 rounded-xl transition-all active:scale-95 flex flex-col items-center gap-1 ${config.promptMode === m.id ? 'bg-white dark:bg-zinc-700 shadow-md ring-1 ring-zinc-200/5' : 'hover:bg-white/50 dark:hover:bg-zinc-700/50'}`}
                  >
                    <span className={`text-xs font-bold ${config.promptMode === m.id ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`}>{m.label}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{m.desc}</span>
                  </button>
                ))}
              </div>
              {config.promptMode === 'custom' && (
                <textarea 
                  value={config.customPrompt} 
                  onChange={e => setConfig({...config, customPrompt: e.target.value})} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 outline-none p-5 rounded-[2rem] text-[14px] min-h-[140px] resize-none transition-all shadow-inner dark:text-zinc-200 leading-relaxed placeholder:text-zinc-400" 
                  placeholder="请输入您的自定义系统提示词..." 
                />
              )}
            </section>

            {/* 辅助功能板块 */}
            <div className="flex items-center justify-between p-5 bg-blue-500/5 dark:bg-blue-500/10 rounded-[2rem] border border-blue-500/10">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <Monitor size={18} />
                </div>
                <div>
                  <h4 className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">界面缩放</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 font-medium">调整全局元素的显示比例</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { id: 'small', label: '小', percent: '80%' },
                  { id: 'medium', label: '中', percent: '100%' },
                  { id: 'large', label: '大', percent: '120%' }
                ].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setConfig({...config, scale: s.id})} 
                    className={`px-5 py-2.5 rounded-xl text-xs transition-all active:scale-95 flex flex-col items-center min-w-[64px] ${config.scale === s.id ? 'bg-blue-500 text-white shadow-lg font-bold' : 'text-zinc-400 hover:text-blue-500 hover:bg-white dark:hover:bg-zinc-800 font-medium'}`}
                  >
                    <span>{s.label}</span>
                    <span className={`text-[9px] mt-0.5 ${config.scale === s.id ? 'text-blue-100' : 'text-zinc-300'}`}>{s.percent}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 底部版权信息 */}
          <div className="pt-2 text-center">
            <p className="text-[10px] text-zinc-400 italic font-mono opacity-60">AI Searcher v0.3.1 • Crafted with Love</p>
          </div>
        </div>
      )}

      {/* 结果展示区 */}
      {showResult && !showSettings && (
        <div className="mt-3 w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 relative group border-2 border-zinc-300 dark:border-zinc-700 shadow-lg bg-clip-padding max-h-[500px]">
          {/* 思考过程 */}
          {reasoning && (
            <div className="mx-8 mt-6 mb-0 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-800 shrink-0 z-20 shadow-sm">
              <div className="w-full flex items-center justify-between px-4 py-2.5">
                <button 
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="flex flex-1 items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2 text-[13px] font-medium">
                    <Brain size={14} className={loading && !answer ? "animate-pulse" : ""} />
                    <span>{loading && !answer ? "正在思考..." : "思考过程"}</span>
                  </div>
                  <ChevronDown size={14} className={`transition-transform duration-300 ${showReasoning ? 'rotate-180' : ''}`} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCopy(reasoning, 'reasoning'); }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                  title="复制思考过程"
                >
                  {reasoningCopied ? (
                    <>
                      <Check size={14} className="text-green-500" />
                      <span className="text-[10px] font-medium text-green-500">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span className="text-[10px] font-medium">复制</span>
                    </>
                  )}
                </button>
              </div>
              
              {showReasoning && (
                <div className="px-4 pb-4 text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/50 pt-3 italic max-h-[160px] overflow-y-auto custom-scrollbar bg-white/[0.02]">
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                     <ReactMarkdown>
                      {reasoning}
                     </ReactMarkdown>
                   </div>
                </div>
              )}
            </div>
          )}

          <div className="relative flex-1 flex flex-col min-h-0">
            {answer && !loading && (
              <button 
                onClick={() => handleCopy(answer, 'answer')}
                className="absolute top-4 right-8 p-2 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-10 flex items-center gap-2 shadow-sm"
                title="复制回答正文"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-green-500" />
                    <span className="text-xs font-medium text-green-500">已复制正文</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span className="text-xs font-medium">复制正文</span>
                  </>
                )}
              </button>
            )}
            
            <div className={`p-8 pt-6 text-zinc-800 dark:text-zinc-100 text-[1.1rem] leading-relaxed custom-scrollbar scroll-smooth flex-1 min-h-0 ${showReasoning ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <div className="prose dark:prose-invert max-w-none prose-p:my-2 prose-pre:bg-zinc-50 dark:prose-pre:bg-zinc-800/50 prose-pre:rounded-2xl">
                  <ReactMarkdown>
                    {answer || (loading && !reasoning ? "正在思考..." : "")}
                  </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
