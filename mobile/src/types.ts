export interface SendResult {
  ok: boolean;
  error?: string;
}

export type PressStatus = "sending" | "sent" | "failed";

export interface LogEntry {
  id: string;
  value: number;
  status: PressStatus;
  time: string;
}

export interface NumberButtonProps {
  value: number;
  disabled?: boolean;
  onPress: (value: number) => void;
}
