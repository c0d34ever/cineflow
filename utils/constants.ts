import { TechnicalStyle, DirectorSettings, StoryContext } from '../types';

export const DEFAULT_DIRECTOR_SETTINGS: DirectorSettings = {
  customSceneId: '',
  lens: '35mm Prime',
  angle: 'Eye Level',
  lighting: 'Natural Cinematic',
  movement: 'Static',
  zoom: '',
  sound: 'Atmospheric ambient',
  dialogue: '',
  stuntInstructions: '',
  physicsFocus: true,
  style: TechnicalStyle.CINEMATIC,
  transition: 'Cut'
};

export const DEFAULT_CONTEXT: StoryContext = {
  id: '',
  lastUpdated: 0,
  title: '',
  genre: '',
  plotSummary: '',
  characters: '',
  initialContext: ''
};

