import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Activity, 
  Terminal, 
  Settings as SettingsIcon, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  AlertTriangle,
  PlusCircle,
  FolderSync,
  Info
} from "lucide-react";
import ReactECharts from "echarts-for-react";

// Types
interface Job {
  id: string;
  name: string;
  triggerMethod: string;
  status: "pending" | "running" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  payload?: any;
}

interface CronSchedule {
  id: string;
  name: string;
  triggerMethod: string;
  cronExpression: string;
  nextRunAt: string;
  isActive: boolean;
  payload?: any;
}

interface Tick {
  symbol: string;
  bid: number;
  ask: number;
  high: number;
  low: number;
  timestamp: string;
}

interface Prediction {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;
  price: number;
  targetPrice: number;
  stopLoss: number;
  takeProfit: number;
  createdAt: string;
}

interface Trade {
  id: string;
  symbol: string;
  action: "BUY" | "SELL";
  volume: number;
  entryPrice: number;
  exitPrice?: number;
  status: "OPEN" | "CLOSED";
  profit: number;
  createdAt: string;
  closedAt?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"scheduler" | "ticks" | "ai" | "settings">("scheduler");
  
  // API URLs
  const API_URL = "http://localhost:3001";
  const WS_URL = "ws://localhost:3001/ws";

  // System status state
  const [sysStatus, setSysStatus] = useState<"connected" | "degraded" | "disconnected">("disconnected");
  
  // Tab 1: Scheduler States
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [schedulesList, setSchedulesList] = useState<CronSchedule[]>([]);
  const [jobStats, setJobStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0 });
  const [isLoadingScheduler, setIsLoadingScheduler] = useState(false);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  
  // Queue Job Form
  const [newJobForm, setNewJobForm] = useState({
    name: "ticks-regular",
    triggerMethod: "RABBITMQ",
    queue: "jobs.ticks.regular",
    priority: 0
  });

  // Tab 2: SSE Ticks States
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [prevTicks, setPrevTicks] = useState<Record<string, Tick>>({});
  const [tickChanges, setTickChanges] = useState<Record<string, "up" | "down" | "none">>({});
  const [selectedChartSymbol, setSelectedChartSymbol] = useState("EURUSD");
  const [chartHistory, setChartHistory] = useState<Record<string, Tick[]>>({
    EURUSD: [],
    GBPUSD: [],
    USDJPY: []
  });
  
  // EventSource reference
  const sseRef = useRef<EventSource | null>(null);

  // Tab 3: WebSockets & Interactive AI States
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedAISymbol, setSelectedAISymbol] = useState("EURUSD");
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [latestPrediction, setLatestPrediction] = useState<{
    prediction: Prediction;
    indicators: { rsi: number; macd: string; bollinger: { upper: number; lower: number } };
  } | null>(null);
  
  const [tradeVolume, setTradeVolume] = useState(0.1);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [wsLogs, setWsLogs] = useState<string[]>([]);
  
  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);

  // Tab 4: Settings State
  const [configsList, setConfigsList] = useState<Record<string, string>>({
    trading_mode: "DEMO",
    auto_trade: "false",
    risk_multiplier: "1.0",
    ai_threshold: "0.75",
    active_pairs: "EURUSD,GBPUSD,USDJPY"
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatusMessage, setSettingsStatusMessage] = useState("");

  // Common notification alert
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Trigger temporary notification
  const triggerAlert = (message: string, type: "success" | "error" | "info" = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  // Fetch Scheduler Data
  const fetchSchedulerData = async () => {
    setIsLoadingScheduler(true);
    try {
      const res = await fetch(`${API_URL}/api/scheduler/jobs`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      
      setJobsList(data.recentJobs || []);
      setSchedulesList(data.schedules || []);
      setJobStats(data.stats || { pending: 0, running: 0, completed: 0, failed: 0 });
      setSysStatus("connected");
    } catch (err: any) {
      logger.error(err, "[UI] Fetching scheduler failed");
      setSysStatus("degraded");
      triggerAlert("Failed to fetch scheduler metrics.", "error");
    } finally {
      setIsLoadingScheduler(false);
    }
  };

  // Trigger manual cron schedule
  const triggerCronSchedule = async (name: string) => {
    try {
      const res = await fetch(`${API_URL}/api/scheduler/cron-schedules/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error();
      triggerAlert(`Triggered schedule: ${name}`);
      // Refresh after short delay
      setTimeout(fetchSchedulerData, 1000);
    } catch (err) {
      triggerAlert("Failed to trigger schedule.", "error");
    }
  };

  // Queue an ad-hoc job manually
  const handleQueueJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsQueueingJob(true);
    try {
      const res = await fetch(`${API_URL}/api/scheduler/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newJobForm.name,
          triggerMethod: newJobForm.triggerMethod,
          payload: { queue: newJobForm.queue },
          priority: Number(newJobForm.priority)
        })
      });
      if (!res.ok) throw new Error();
      triggerAlert(`Enqueued job: ${newJobForm.name}`);
      setTimeout(fetchSchedulerData, 1000);
    } catch (err) {
      triggerAlert("Failed to queue job.", "error");
    } finally {
      setIsQueueingJob(false);
    }
  };

  // Fetch Settings Configuration
  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`);
      if (res.ok) {
        const data = await res.json();
        setConfigsList(data);
      }
    } catch (err) {
      logger.error(err, "[UI] Config load failed");
    }
  };

  // Save Settings
  const saveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsStatusMessage("");
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configsList)
      });
      if (!res.ok) throw new Error();
      setSettingsStatusMessage("Settings saved successfully!");
      triggerAlert("Configurations saved.");
    } catch (err) {
      setSettingsStatusMessage("Error saving settings.");
      triggerAlert("Failed to save configs.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Fetch Position History from API
  const fetchPositions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/trades`);
      if (res.ok) {
        const list: Trade[] = await res.json();
        setOpenTrades(list.filter((t) => t.status === "OPEN"));
        setClosedTrades(list.filter((t) => t.status === "CLOSED"));
      }
    } catch (err) {
      logger.error(err, "[UI] Position load failed");
    }
  };

  // Simplex Mode: Connect EventSource
  useEffect(() => {
    logger.info("[SSE] Establishing Simplex tick connection...");
    const sse = new EventSource(`${API_URL}/api/simplex/ticks`);
    sseRef.current = sse;

    sse.addEventListener("tick", (e: MessageEvent) => {
      const tick: Tick = JSON.parse(e.data);
      
      setTicks((prev) => {
        const prevTick = prev[tick.symbol];
        // Flash indicator logic
        const direction = prevTick
          ? tick.bid > prevTick.bid
            ? "up"
            : tick.bid < prevTick.bid
            ? "down"
            : "none"
          : "none";
        
        setTickChanges((prevDirs) => ({ ...prevDirs, [tick.symbol]: direction }));
        
        // Remove animation class after delay
        setTimeout(() => {
          setTickChanges((prevDirs) => ({ ...prevDirs, [tick.symbol]: "none" }));
        }, 1000);

        return { ...prev, [tick.symbol]: tick };
      });

      // Update Chart history
      setChartHistory((prevHist) => {
        const symHistory = prevHist[tick.symbol] || [];
        const newHistory = [...symHistory, tick].slice(-25); // retain last 25 ticks
        return { ...prevHist, [tick.symbol]: newHistory };
      });
    });

    sse.onopen = () => {
      logger.info("[SSE] Connection established.");
    };

    sse.onerror = () => {
      logger.warn("[SSE] Connection lost. Trying reconnect...");
    };

    return () => {
      logger.info("[SSE] Closing connection...");
      sse.close();
    };
  }, []);

  // Full-Duplex Mode: Connect WebSockets
  const connectWebSocket = () => {
    if (wsRef.current) return;
    
    logger.info("[WebSocket] Connecting to Full-Duplex endpoint...");
    setWsLogs((prev) => [...prev, `[System] Connecting to WS: ${WS_URL}...`]);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      setWsLogs((prev) => [...prev, "[System] WebSocket Connection Established."]);
    };

    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        
        // Log generic logs except ticks to avoid spam
        if (payload.type !== "tick") {
          setWsLogs((prev) => [...prev, `[Server] ${JSON.stringify(payload)}`]);
        }

        switch (payload.type) {
          case "connection_ack":
            triggerAlert("Full-Duplex channel linked.");
            break;
          case "analysis_result":
            setIsAIAnalyzing(false);
            setLatestPrediction(payload.data);
            triggerAlert(`AI analysis complete for ${payload.symbol}`);
            break;
          case "trade_executed":
            triggerAlert(`Position opened: ${payload.data.action} ${payload.data.symbol}`);
            fetchPositions();
            break;
          case "trade_closed":
            triggerAlert(`Position closed: Net PnL $${payload.data.profit}`);
            fetchPositions();
            break;
          case "tick":
            // Ticks are also sent here if subscribed via WS.
            // We update open positions profit in the UI
            break;
          case "error":
            setIsAIAnalyzing(false);
            triggerAlert(payload.message, "error");
            break;
        }
      } catch (err) {
        logger.error(err, "[WS] Error parsing message");
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      setWsLogs((prev) => [...prev, "[System] Connection Closed."]);
    };

    ws.onerror = (err) => {
      logger.error(err, "[WS] Connection error");
      setWsConnected(false);
      wsRef.current = null;
      setWsLogs((prev) => [...prev, "[System] Connection Error."]);
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
    }
  };

  // Place trade order via WebSockets
  const requestTradeExecution = (action: "BUY" | "SELL") => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      triggerAlert("WebSocket is not connected.", "error");
      return;
    }
    const message = {
      type: "execute_trade",
      symbol: selectedAISymbol,
      action,
      volume: tradeVolume
    };
    wsRef.current.send(JSON.stringify(message));
    setWsLogs((prev) => [...prev, `[Client] Sent: execute_trade ${action} ${selectedAISymbol} ${tradeVolume} lots`]);
  };

  // Close trade position via WebSockets
  const requestClosePosition = (tradeId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // Fallback HTTP if WebSocket disconnected
      closePositionViaHttp(tradeId);
      return;
    }
    const message = {
      type: "close_trade",
      tradeId
    };
    wsRef.current.send(JSON.stringify(message));
    setWsLogs((prev) => [...prev, `[Client] Sent: close_trade ${tradeId}`]);
  };

  const closePositionViaHttp = async (tradeId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/trades/${tradeId}`, { method: "DELETE" });
      if (res.ok) {
        triggerAlert("Position closed successfully via REST API fallback.");
        fetchPositions();
      }
    } catch (err) {
      triggerAlert("Failed to close position.", "error");
    }
  };

  // Request AI Prediction via WebSockets
  const requestAIPrediction = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      triggerAlert("WebSocket is not connected.", "error");
      return;
    }
    setIsAIAnalyzing(true);
    setLatestPrediction(null);
    const message = {
      type: "analyze",
      symbol: selectedAISymbol
    };
    wsRef.current.send(JSON.stringify(message));
    setWsLogs((prev) => [...prev, `[Client] Sent: analyze ${selectedAISymbol}`]);
  };

  // Periodic polling for REST API components
  useEffect(() => {
    fetchSchedulerData();
    fetchConfigs();
    fetchPositions();

    const interval = setInterval(() => {
      fetchSchedulerData();
      fetchPositions(); // refresh profits in open positions table
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Establish WebSockets on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // ECharts options calculation
  const getEChartOption = (symbol: string) => {
    const data = chartHistory[symbol] || [];
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(12, 12, 15, 0.95)",
        borderColor: "rgba(38, 38, 48, 0.7)",
        textStyle: { color: "#fafafa", fontFamily: "DM Sans" }
      },
      grid: {
        top: "10%",
        left: "3%",
        right: "3%",
        bottom: "5%",
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: data.map((t) => new Date(t.timestamp).toLocaleTimeString()),
        axisLabel: { color: "#71717a", fontSize: 10 },
        axisLine: { lineStyle: { color: "#1e1e24" } }
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { color: "#71717a", fontSize: 10 },
        axisLine: { lineStyle: { color: "#1e1e24" } },
        splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.03)" } }
      },
      series: [
        {
          name: `${symbol} Price`,
          type: "line",
          data: data.map((t) => (t.bid + t.ask) / 2),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#2563eb", width: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(37, 99, 235, 0.15)" },
                { offset: 1, color: "rgba(37, 99, 235, 0.0)" }
              ]
            }
          }
        }
      ]
    };
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header Panel */}
      <header className="max-w-[1600px] mx-auto px-6 py-4 flex justify-between items-center border-b border-[#1e1e24] mb-8 bg-zinc-950/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
            <Cpu className="text-blue-500 w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">GEONERA</h1>
            <p className="text-xs text-zinc-500">AI-Powered System Dashboard</p>
          </div>
        </div>

        {/* Global Connection Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
            <span className={sysStatus === "connected" ? "pulse-green" : "w-2 h-2 rounded-full bg-rose-500"} />
            <span className="capitalize font-semibold text-zinc-300">
              API Status: {sysStatus === "connected" ? "Online" : sysStatus === "degraded" ? "Degraded" : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
            <span className={wsConnected ? "pulse-green" : "w-2 h-2 rounded-full bg-rose-500"} />
            <span className="capitalize font-semibold text-zinc-300">
              WebSocket: {wsConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-6">
        
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-[#1e1e24] mb-8 pb-1">
          <button 
            onClick={() => setActiveTab("scheduler")}
            className={`btn btn-ghost px-4 py-2 border-b-2 rounded-none transition-all ${
              activeTab === "scheduler" ? "border-blue-500 text-blue-500" : "border-transparent"
            }`}
          >
            <Activity size={18} />
            Scheduler Control
          </button>
          
          <button 
            onClick={() => setActiveTab("ticks")}
            className={`btn btn-ghost px-4 py-2 border-b-2 rounded-none transition-all ${
              activeTab === "ticks" ? "border-blue-500 text-blue-500" : "border-transparent"
            }`}
          >
            <TrendingUp size={18} />
            Live Market Feed (SSE)
          </button>

          <button 
            onClick={() => setActiveTab("ai")}
            className={`btn btn-ghost px-4 py-2 border-b-2 rounded-none transition-all ${
              activeTab === "ai" ? "border-blue-500 text-blue-500" : "border-transparent"
            }`}
          >
            <Terminal size={18} />
            AI Interactive Terminal (WS)
          </button>

          <button 
            onClick={() => setActiveTab("settings")}
            className={`btn btn-ghost px-4 py-2 border-b-2 rounded-none transition-all ${
              activeTab === "settings" ? "border-blue-500 text-blue-500" : "border-transparent"
            }`}
          >
            <SettingsIcon size={18} />
            System Settings
          </button>
        </div>

        {/* Floating Notification Alert */}
        {alert && (
          <div className={`fixed bottom-6 right-6 z-50 glass-panel p-4 flex items-center gap-3 border-l-4 ${
            alert.type === "success" 
              ? "border-l-emerald-500 text-emerald-300 bg-emerald-950/20" 
              : alert.type === "error" 
              ? "border-l-rose-500 text-rose-300 bg-rose-950/20"
              : "border-l-blue-500 text-blue-300 bg-blue-950/20"
          }`}>
            {alert.type === "success" ? <CheckCircle size={18} /> : alert.type === "error" ? <XCircle size={18} /> : <Info size={18} />}
            <span className="text-sm font-medium">{alert.message}</span>
          </div>
        )}

        {/* Tab 1: Scheduler Control (Half-Duplex HTTP) */}
        {activeTab === "scheduler" && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass-panel p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Jobs</span>
                  <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-md">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-amber-500">{jobStats.pending}</div>
                <div className="text-xs text-zinc-500 mt-1">Queued for execution</div>
              </div>

              <div className="glass-panel p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Running Jobs</span>
                  <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-md">
                    <Activity size={16} />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-blue-500">{jobStats.running}</div>
                <div className="text-xs text-zinc-500 mt-1">Currently active</div>
              </div>

              <div className="glass-panel p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Completed Jobs</span>
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md">
                    <CheckCircle size={16} />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-emerald-500">{jobStats.completed}</div>
                <div className="text-xs text-zinc-500 mt-1">Processed successfully</div>
              </div>

              <div className="glass-panel p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Failed Jobs</span>
                  <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-md">
                    <XCircle size={16} />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-rose-500">{jobStats.failed}</div>
                <div className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Needs attention
                </div>
              </div>
            </div>

            {/* Split Section: Schedules and Job Queue Forms */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              
              {/* Cron Schedules (2 cols wide) */}
              <div className="glass-panel p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FolderSync size={18} className="text-blue-500" />
                    Seeded Cron Schedules
                  </h3>
                  <button onClick={fetchSchedulerData} className="btn btn-secondary py-1 px-3 text-xs" disabled={isLoadingScheduler}>
                    <RefreshCw size={12} className={isLoadingScheduler ? "animate-spin" : ""} />
                    Sync
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Schedule Name</th>
                        <th>Expression</th>
                        <th>Trigger</th>
                        <th>Next Run</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedulesList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-zinc-500 py-6">No schedules seeded</td>
                        </tr>
                      ) : (
                        schedulesList.map((sched) => (
                          <tr key={sched.id}>
                            <td className="font-semibold text-zinc-200">{sched.name}</td>
                            <td><code className="bg-zinc-900 border border-zinc-800 rounded px-1.5 text-blue-400">{sched.cronExpression}</code></td>
                            <td className="text-xs text-zinc-400">{sched.triggerMethod}</td>
                            <td className="text-xs font-mono text-zinc-400">{new Date(sched.nextRunAt).toLocaleTimeString()}</td>
                            <td>
                              <span className={`badge ${sched.isActive ? "badge-completed" : "badge-failed"}`}>
                                {sched.isActive ? "Active" : "Disabled"}
                              </span>
                            </td>
                            <td>
                              <button onClick={() => triggerCronSchedule(sched.name)} className="btn btn-primary py-1 px-2.5 text-xs flex items-center gap-1">
                                <Play size={10} /> Fire
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Queue Ad-hoc Job (1 col wide) */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <PlusCircle size={18} className="text-blue-500" />
                  Queue Manual Job
                </h3>
                <form onSubmit={handleQueueJob} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Job Identifier/Name</label>
                    <select 
                      value={newJobForm.name} 
                      onChange={(e) => {
                        const name = e.target.value;
                        const queue = name === "cleanup-jobs" ? "" : `jobs.${name.replace("-", ".")}`;
                        const method = name === "cleanup-jobs" ? "INTERNAL" : "RABBITMQ";
                        setNewJobForm((prev) => ({ ...prev, name, queue, triggerMethod: method }));
                      }}
                      className="input-field"
                    >
                      <option value="ticks-regular">ticks-regular (RabbitMQ Price Feed)</option>
                      <option value="ticks-backfill">ticks-backfill</option>
                      <option value="candles-regular">candles-regular</option>
                      <option value="candles-backfill">candles-backfill</option>
                      <option value="sync">sync</option>
                      <option value="maintenance">maintenance</option>
                      <option value="cleanup-jobs">cleanup-jobs (Internal DB prune)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Trigger Protocol</label>
                    <input type="text" className="input-field opacity-60" value={newJobForm.triggerMethod} readOnly />
                  </div>
                  {newJobForm.triggerMethod === "RABBITMQ" && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">RabbitMQ Routing Queue</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newJobForm.queue} 
                        onChange={(e) => setNewJobForm(prev => ({ ...prev, queue: e.target.value }))}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Priority Weight</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      className="input-field" 
                      value={newJobForm.priority} 
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={isQueueingJob}>
                    {isQueueingJob ? "Adding..." : "Enqueue Job"}
                  </button>
                </form>
              </div>
            </div>

            {/* Recent Executions Log */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Terminal size={18} className="text-blue-500" />
                Recent Executed Jobs Log
              </h3>
              <div className="overflow-x-auto">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Job Name</th>
                      <th>Trigger</th>
                      <th>Status</th>
                      <th>Scheduled</th>
                      <th>Started</th>
                      <th>Finished</th>
                      <th>Attempts</th>
                      <th>Error Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-zinc-500 py-6">No jobs found in queue</td>
                      </tr>
                    ) : (
                      jobsList.map((job) => (
                        <tr key={job.id}>
                          <td className="font-mono text-xs text-zinc-500">{job.id.slice(0, 8)}...</td>
                          <td className="font-bold text-zinc-200">{job.name}</td>
                          <td className="text-xs text-zinc-400">{job.triggerMethod}</td>
                          <td>
                            <span className={`badge badge-${job.status}`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="text-xs font-mono text-zinc-400">{new Date(job.scheduledAt).toLocaleTimeString()}</td>
                          <td className="text-xs font-mono text-zinc-400">{job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : "-"}</td>
                          <td className="text-xs font-mono text-zinc-400">{job.finishedAt ? new Date(job.finishedAt).toLocaleTimeString() : "-"}</td>
                          <td>{job.attempts} / {job.maxAttempts}</td>
                          <td className="text-xs max-w-[200px] truncate text-rose-400 font-mono" title={job.error}>
                            {job.error || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Market Feed (Simplex SSE) */}
        {activeTab === "ticks" && (
          <div>
            {/* Live Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {Object.keys(PRICES).map((symbol) => {
                const tick = ticks[symbol];
                const prev = prevTicks[symbol];
                const change = tickChanges[symbol] || "none";
                
                if (!tick) return (
                  <div key={symbol} className="glass-panel p-6 animate-pulse flex flex-col justify-between h-40">
                    <span className="text-xs text-zinc-500 font-bold">{symbol}</span>
                    <span className="text-lg text-zinc-600">Connecting to feed...</span>
                  </div>
                );

                return (
                  <div 
                    key={symbol} 
                    onClick={() => setSelectedChartSymbol(symbol)}
                    className={`glass-panel p-6 cursor-pointer border-2 transition-all ${
                      selectedChartSymbol === symbol ? "border-blue-500 bg-blue-950/5" : "border-transparent"
                    } ${change === "up" ? "flash-up" : change === "down" ? "flash-down" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-lg font-extrabold tracking-tight">{symbol}</span>
                        <div className="text-xs text-zinc-500">Forex Spot</div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 text-[10px] font-mono border border-zinc-800 text-zinc-300">
                        Spread: {symbol === "USDJPY" ? Math.round((tick.ask - tick.bid)*1000)/10 : Math.round((tick.ask - tick.bid)*100000)/10} pips
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline mb-3">
                      <div>
                        <div className="text-xs text-zinc-500">BID (SELL)</div>
                        <div className="text-2xl font-mono font-extrabold">{tick.bid.toFixed(symbol === "USDJPY" ? 3 : 5)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-500">ASK (BUY)</div>
                        <div className="text-2xl font-mono font-extrabold">{tick.ask.toFixed(symbol === "USDJPY" ? 3 : 5)}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-zinc-500 border-t border-zinc-900 pt-3">
                      <div>Low: <span className="font-mono">{tick.low.toFixed(symbol === "USDJPY" ? 2 : 4)}</span></div>
                      <div>High: <span className="font-mono">{tick.high.toFixed(symbol === "USDJPY" ? 2 : 4)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Historical Price Chart */}
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold">Real-time Pricing Trendline</h3>
                  <p className="text-xs text-zinc-500">Showing last 25 tick prices gathered via SSE stream</p>
                </div>
                
                <div className="flex gap-2">
                  {["EURUSD", "GBPUSD", "USDJPY"].map((sym) => (
                    <button 
                      key={sym} 
                      onClick={() => setSelectedChartSymbol(sym)}
                      className={`btn py-1 px-3 text-xs ${
                        selectedChartSymbol === sym ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {chartHistory[selectedChartSymbol] && chartHistory[selectedChartSymbol].length > 1 ? (
                <div className="h-96 w-full">
                  <ReactECharts 
                    option={getEChartOption(selectedChartSymbol)} 
                    style={{ height: "100%", width: "100%" }}
                    theme="dark"
                  />
                </div>
              ) : (
                <div className="h-96 w-full flex items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
                  Waiting for ticks stream to populate the trendline...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: AI Interactive Terminal (Full-Duplex WebSockets) */}
        {activeTab === "ai" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* WS control panel */}
              <div className="glass-panel p-6 space-y-6">
                <h3 className="text-lg font-bold">WebSocket Controller</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-300">Connection State</span>
                    <span className={`badge ${wsConnected ? "badge-completed" : "badge-failed"}`}>
                      {wsConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={connectWebSocket} 
                      disabled={wsConnected} 
                      className="btn btn-primary flex-1"
                    >
                      Connect
                    </button>
                    <button 
                      onClick={disconnectWebSocket} 
                      disabled={!wsConnected} 
                      className="btn btn-secondary flex-1"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div className="border-t border-zinc-900 pt-6 space-y-4">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Analysis Request</h4>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2">Select Market Symbol</label>
                    <select 
                      value={selectedAISymbol} 
                      onChange={(e) => setSelectedAISymbol(e.target.value)}
                      className="input-field"
                    >
                      <option value="EURUSD">EURUSD (Euro / US Dollar)</option>
                      <option value="GBPUSD">GBPUSD (Great Britain Pound / US Dollar)</option>
                      <option value="USDJPY">USDJPY (US Dollar / Japanese Yen)</option>
                    </select>
                  </div>

                  <button 
                    onClick={requestAIPrediction} 
                    disabled={!wsConnected || isAIAnalyzing} 
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isAIAnalyzing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        AI Generating...
                      </>
                    ) : (
                      <>
                        <Cpu size={14} />
                        Request AI Signal
                      </>
                    )}
                  </button>
                </div>

                {/* Instant Mock Order Executor */}
                <div className="border-t border-zinc-900 pt-6 space-y-4">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Trade Order (WS)</h4>
                  
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2">Order Size (Standard Lots)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.01" 
                      className="input-field"
                      value={tradeVolume}
                      onChange={(e) => setTradeVolume(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => requestTradeExecution("BUY")}
                      disabled={!wsConnected}
                      className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-white flex-1 font-bold py-3"
                    >
                      BUY (ASK)
                    </button>
                    <button 
                      onClick={() => requestTradeExecution("SELL")}
                      disabled={!wsConnected}
                      className="btn btn-destructive flex-1 font-bold py-3"
                    >
                      SELL (BID)
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Prediction Outputs */}
              <div className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-4">Latest AI Prediction Signals</h3>
                  
                  {latestPrediction ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                        <div>
                          <span className="text-xs text-zinc-500">SYMBOL</span>
                          <h4 className="text-lg font-extrabold text-zinc-100">{latestPrediction.prediction.symbol}</h4>
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-zinc-500">DIRECTION</span>
                          <div>
                            <span className={`badge text-sm font-bold ${
                              latestPrediction.prediction.direction === "BUY" 
                                ? "badge-completed" 
                                : latestPrediction.prediction.direction === "SELL" 
                                ? "badge-failed" 
                                : "badge-pending"
                            }`}>
                              {latestPrediction.prediction.direction}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-zinc-500">CONFIDENCE</span>
                          <h4 className="text-lg font-mono font-extrabold text-blue-400">
                            {Math.round(latestPrediction.prediction.confidence * 100)}%
                          </h4>
                        </div>
                      </div>

                      {/* Technical Indicators */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
                          <span className="text-xs text-zinc-500">RSI (14) Indicator</span>
                          <div className="text-lg font-mono font-bold text-zinc-200 mt-1">{latestPrediction.indicators.rsi}</div>
                          <div className="text-[10px] text-zinc-500">
                            {latestPrediction.indicators.rsi < 35 
                              ? "Oversold (Bullish bias)" 
                              : latestPrediction.indicators.rsi > 65 
                              ? "Overbought (Bearish bias)" 
                              : "Neutral momentum"}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
                          <span className="text-xs text-zinc-500">MACD Histogram</span>
                          <div className="text-lg font-mono font-bold text-zinc-200 mt-1 capitalize">
                            {latestPrediction.indicators.macd.replace("_", " ")}
                          </div>
                          <div className="text-[10px] text-zinc-500">Trend crossover signal</div>
                        </div>

                        <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
                          <span className="text-xs text-zinc-500">Bollinger Bands</span>
                          <div className="text-xs font-mono text-zinc-300 mt-1">
                            High: {latestPrediction.indicators.bollinger.upper.toFixed(latestPrediction.prediction.symbol === "USDJPY" ? 2 : 4)}
                          </div>
                          <div className="text-xs font-mono text-zinc-300">
                            Low: {latestPrediction.indicators.bollinger.lower.toFixed(latestPrediction.prediction.symbol === "USDJPY" ? 2 : 4)}
                          </div>
                        </div>
                      </div>

                      {/* Price Targets */}
                      <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <div>
                          <span className="text-xs text-zinc-500">Strike Price</span>
                          <div className="font-mono text-sm text-zinc-300">{latestPrediction.prediction.price.toFixed(latestPrediction.prediction.symbol === "USDJPY" ? 3 : 5)}</div>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500">Target price</span>
                          <div className="font-mono text-sm text-blue-400 font-bold">{latestPrediction.prediction.targetPrice.toFixed(latestPrediction.prediction.symbol === "USDJPY" ? 3 : 5)}</div>
                        </div>
                        <div>
                          <span className="text-xs text-rose-500">Stop Loss</span>
                          <div className="font-mono text-sm text-rose-400">{latestPrediction.prediction.stopLoss.toFixed(latestPrediction.prediction.symbol === "USDJPY" ? 3 : 5)}</div>
                        </div>
                        <div>
                          <span className="text-xs text-emerald-500">Take Profit</span>
                          <div className="font-mono text-sm text-emerald-400">{latestPrediction.prediction.takeProfit.toFixed(latestPrediction.prediction.symbol === "USDJPY" ? 3 : 5)}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                      <Cpu size={32} className="text-zinc-600 mb-2 animate-bounce" />
                      <span>Request an AI prediction signal to view parameters here</span>
                    </div>
                  )}
                </div>

                {/* WebSocket Event logs console */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">WebSocket Transaction Logs Console</h4>
                  <div className="bg-black/80 border border-zinc-900 p-3 rounded-lg h-32 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1">
                    {wsLogs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Live Portfolio Manager */}
            <div className="grid grid-cols-1 gap-8">
              
              {/* Open trades */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                  <span>Active Open Market Trades</span>
                  <span className="text-xs font-mono text-zinc-400 font-normal">
                    Floating profit is updated dynamically as prices fluctuate
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Trade ID</th>
                        <th>Symbol</th>
                        <th>Action</th>
                        <th>Lots</th>
                        <th>Entry Price</th>
                        <th>Floating P&L</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-zinc-500 py-6">No open trades. Place orders using the controller panel.</td>
                        </tr>
                      ) : (
                        openTrades.map((t) => (
                          <tr key={t.id}>
                            <td className="font-mono text-xs text-zinc-500">{t.id.slice(0, 8)}...</td>
                            <td className="font-bold text-zinc-200">{t.symbol}</td>
                            <td>
                              <span className={`badge ${t.action === "BUY" ? "badge-completed" : "badge-failed"}`}>
                                {t.action}
                              </span>
                            </td>
                            <td className="font-mono">{t.volume.toFixed(2)}</td>
                            <td className="font-mono text-zinc-300">{t.entryPrice.toFixed(t.symbol === "USDJPY" ? 3 : 5)}</td>
                            <td className={`font-mono font-bold ${t.profit > 0 ? "text-emerald-400" : t.profit < 0 ? "text-rose-400" : "text-zinc-300"}`}>
                              ${t.profit.toFixed(2)}
                            </td>
                            <td className="text-xs text-zinc-400">{new Date(t.createdAt).toLocaleTimeString()}</td>
                            <td>
                              <button onClick={() => requestClosePosition(t.id)} className="btn btn-destructive py-1 px-3 text-xs">
                                Close Position
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Closed trades */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold mb-4">Historical Closed Trades Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Trade ID</th>
                        <th>Symbol</th>
                        <th>Action</th>
                        <th>Lots</th>
                        <th>Entry Price</th>
                        <th>Closed Price</th>
                        <th>Closed P&L</th>
                        <th>Closed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedTrades.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-zinc-500 py-6">No trades closed yet</td>
                        </tr>
                      ) : (
                        closedTrades.slice(0, 10).map((t) => (
                          <tr key={t.id}>
                            <td className="font-mono text-xs text-zinc-500">{t.id.slice(0, 8)}...</td>
                            <td className="font-bold text-zinc-200">{t.symbol}</td>
                            <td>
                              <span className={`badge ${t.action === "BUY" ? "badge-completed" : "badge-failed"}`}>
                                {t.action}
                              </span>
                            </td>
                            <td className="font-mono">{t.volume.toFixed(2)}</td>
                            <td className="font-mono text-zinc-300">{t.entryPrice.toFixed(t.symbol === "USDJPY" ? 3 : 5)}</td>
                            <td className="font-mono text-zinc-300">{t.exitPrice?.toFixed(t.symbol === "USDJPY" ? 3 : 5) || "-"}</td>
                            <td className={`font-mono font-bold ${t.profit > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              ${t.profit.toFixed(2)}
                            </td>
                            <td className="text-xs text-zinc-400">{t.closedAt ? new Date(t.closedAt).toLocaleTimeString() : "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 4: Settings (Half-Duplex HTTP) */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto glass-panel p-8">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <SettingsIcon className="text-blue-500" />
              Global Trading System Parameters
            </h3>

            <form onSubmit={saveConfigs} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Operation Trading Mode</label>
                <div className="flex gap-4">
                  {["DEMO", "LIVE"].map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setConfigsList(prev => ({ ...prev, trading_mode: mode }))}
                      className={`btn flex-1 py-3 ${
                        configsList.trading_mode === mode ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {mode} Mode
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Auto-Trading Execution (AI Agents)</label>
                <div className="flex gap-4">
                  {["true", "false"].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setConfigsList(prev => ({ ...prev, auto_trade: val }))}
                      className={`btn flex-1 py-3 ${
                        configsList.auto_trade === val 
                          ? val === "true" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "btn-primary"
                          : "btn-secondary"
                      }`}
                    >
                      {val === "true" ? "Auto-Trade ON" : "Auto-Trade OFF"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 tracking-wider mb-2 uppercase">
                  Global Risk Multiplier ({configsList.risk_multiplier}x)
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="5.0" 
                  step="0.1" 
                  className="w-full accent-blue-500 cursor-pointer bg-zinc-900 border border-zinc-800 p-2 rounded" 
                  value={configsList.risk_multiplier}
                  onChange={(e) => {
                    const risk = e.target.value;
                    setConfigsList(prev => ({ ...prev, risk_multiplier: risk }));
                  }}
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Conservative (0.1x)</span>
                  <span>Balanced (1.0x)</span>
                  <span>Aggressive (5.0x)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 tracking-wider mb-2 uppercase">
                  AI Model Decision Confidence Threshold ({Math.round(Number(configsList.ai_threshold) * 100)}%)
                </label>
                <input 
                  type="range" 
                  min="0.50" 
                  max="0.95" 
                  step="0.05" 
                  className="w-full accent-blue-500 cursor-pointer bg-zinc-900 border border-zinc-800 p-2 rounded" 
                  value={configsList.ai_threshold}
                  onChange={(e) => {
                    const threshold = e.target.value;
                    setConfigsList(prev => ({ ...prev, ai_threshold: threshold }));
                  }}
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Frequent Signals (50%)</span>
                  <span>Balanced Signals (75%)</span>
                  <span>Strict Precision (95%)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tracked Market Symbol Pairs (CSV)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={configsList.active_pairs}
                  onChange={(e) => {
                    const pairs = e.target.value;
                    setConfigsList(prev => ({ ...prev, active_pairs: pairs }));
                  }}
                />
              </div>

              {settingsStatusMessage && (
                <div className={`p-4 rounded-xl border ${
                  settingsStatusMessage.includes("success")
                    ? "border-emerald-500/20 text-emerald-400 bg-emerald-950/20"
                    : "border-rose-500/20 text-rose-400 bg-rose-950/20"
                }`}>
                  {settingsStatusMessage}
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full py-3" disabled={isSavingSettings}>
                {isSavingSettings ? "Saving Settings..." : "Save System Configs"}
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}

// Initial fallback values to prevent empty array reference crashes
const PRICES: Record<string, any> = {
  EURUSD: {},
  GBPUSD: {},
  USDJPY: {},
};
