import type { QueryResult } from "./api";

type TokenCallback = (token: string) => void;
type DoneCallback = (metadata: QueryResult) => void;
type ErrorCallback = (error: string, recoverable: boolean) => void;
type StateCallback = (state: "connecting" | "connected" | "disconnected" | "error") => void;

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url = "";
  private tokenCallbacks = new Set<TokenCallback>();
  private doneCallbacks = new Set<DoneCallback>();
  private errorCallbacks = new Set<ErrorCallback>();
  private stateCallbacks = new Set<StateCallback>();
  private manuallyClosed = false;
  private reconnectTimer: number | null = null;

  connect(url: string = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws"): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
    this.url = url;
    this.manuallyClosed = false;
    this.emitState("connecting");
    this.socket = new WebSocket(url);
    this.socket.onopen = () => this.emitState("connected");
    this.socket.onmessage = (event: MessageEvent<string>) => this.handleMessage(event.data);
    this.socket.onerror = () => {
      this.emitState("error");
      this.errorCallbacks.forEach((cb) => cb("Streaming connection interrupted.", true));
    };
    this.socket.onclose = () => {
      this.emitState("disconnected");
      this.socket = null;
      if (!this.manuallyClosed) {
        if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => this.connect(this.url), 1600);
      }
    };
  }

  onToken(callback: TokenCallback): () => void { this.tokenCallbacks.add(callback); return () => this.tokenCallbacks.delete(callback); }
  onDone(callback: DoneCallback): () => void { this.doneCallbacks.add(callback); return () => this.doneCallbacks.delete(callback); }
  onError(callback: ErrorCallback): () => void { this.errorCallbacks.add(callback); return () => this.errorCallbacks.delete(callback); }
  onState(callback: StateCallback): () => void { this.stateCallbacks.add(callback); return () => this.stateCallbacks.delete(callback); }

  send(query: string): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ query }));
      return true;
    }
    this.connect(this.url || undefined);
    return false;
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.socket?.close();
  }

  private emitState(state: "connecting" | "connected" | "disconnected" | "error"): void {
    this.stateCallbacks.forEach((cb) => cb(state));
  }

  private handleMessage(data: string): void {
    data.trim().split("\n").forEach((line) => {
      if (!line) return;
      const message = JSON.parse(line) as { type: string; content?: string; metadata?: QueryResult; message?: string };
      if (message.type === "token" && message.content) this.tokenCallbacks.forEach((cb) => cb(message.content || ""));
      if (message.type === "done" && message.metadata) this.doneCallbacks.forEach((cb) => cb(message.metadata as QueryResult));
      if (message.type === "error") this.errorCallbacks.forEach((cb) => cb(message.message || "Unknown query error", false));
    });
  }
}

