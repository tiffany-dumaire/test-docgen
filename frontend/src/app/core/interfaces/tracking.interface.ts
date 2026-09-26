export interface TrackTask {
  id: string; name: string; start?: string; end?: string; progress?: number;
  planned_end?: string; team?: string; status?: string; deps?: string[];
}
export interface TrackMilestone { name: string; planned?: string; actual?: string; }
export interface TrackRisk { name: string; probability?: number; impact?: number; status?: string; action?: string; }
export interface TrackSnapshot { date?: string; planned?: number; actual?: number; }
export interface TrackRoadmapItem { title: string; date?: string; }
export interface ProjectTracking {
  tasks?: TrackTask[]; milestones?: TrackMilestone[]; risks?: TrackRisk[];
  snapshots?: TrackSnapshot[]; roadmap?: TrackRoadmapItem[];
}
