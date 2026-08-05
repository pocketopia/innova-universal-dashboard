export type TabType = 'dashboard' | 'kreation' | 'entertainment' | 'streamshare';

export interface NetworkNode {
  id: string;
  name: string;
  status: 'offline' | 'initializing' | 'online';
  cores: number;
  region: string;
  uptime: number; // percentage
  peers: number;
  bandwidth: number; // MB/s
  logs: string[];
}

export interface WalletState {
  connected: boolean;
  address: string;
  balance: number; // in $INVA
  seedPhrase: string[];
  generating: boolean;
  confirmed: boolean;
}

export interface IndieGame {
  id: string;
  name: string;
  developer: string;
  genre: string;
  tags: string[];
  bannerUrl: string;
  description: string;
  systemRequirements: string;
  torrentHash?: string;
  status: 'Pending' | 'Approved' | 'Denied';
  submittedAt: string;
  notes?: string;
}

export interface VideoSubmission {
  id: string;
  title: string;
  creator: string;
  camera: string;
  resolution: string;
  audioFormat: string;
  selectedChannels: string[];
  licensingTerms: boolean;
  submittedAt: string;
  currentStep: 'Ingest' | 'Quality Control' | 'Licensing Review' | 'Scheduled for Distribution';
  status: 'Pending' | 'Success' | 'Issue';
}

export interface StreamShareProject {
  id: string;
  title: string;
  creatorId: string;
  clientId: string;
  assetUrl: string;
  fileSize: string;
  status: 'awaiting_feedback' | 'client_reviewed' | 'approved_released';
  comments: {
    id: string;
    author: string;
    text: string;
    timestamp: string;
  }[];
}
