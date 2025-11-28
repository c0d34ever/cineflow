
export enum TechnicalStyle {
  CINEMATIC = 'Cinematic',
  DOCUMENTARY = 'Documentary',
  ANIMATION = '3D Animation',
  VINTAGE = 'Vintage Film',
}

export interface DirectorSettings {
  customSceneId: string; // User defined ID (e.g. SC-05)
  lens: string;
  angle: string;
  lighting: string;
  movement: string;
  zoom: string; // New field for Camera Zoom
  sound: string;
  dialogue: string; // Spoken lines
  stuntInstructions: string; // Specific instructions for action/stunts
  physicsFocus: boolean;
  style: TechnicalStyle;
  transition: string;
}

export interface Scene {
  id: string;
  sequenceNumber: number;
  rawIdea: string;
  enhancedPrompt: string; // The "Director" refined prompt
  status: 'planning' | 'generating' | 'completed' | 'failed';
  directorSettings: DirectorSettings;
  contextSummary: string; // What happened in this scene (for next scene context)
}

export interface StoryContext {
  id: string; // Unique Project ID
  lastUpdated: number; // Timestamp
  title: string;
  genre: string;
  plotSummary: string;
  characters: string;
  initialContext?: string; // Optional: Description of the last clip to resume from
}
