export type StationId = 'capture' | 'edit' | 'delivery' | 'client';
export type ProductionStationId = Exclude<StationId, 'client'>;
export type AssignmentPhase = 'moving' | 'working';
export type JobBriefId = 'event' | 'portrait' | 'rush';
export type AssistantTask = 'client' | 'handoff';
export type EquipmentId = 'backup-body' | 'dual-reader' | 'hotspot' | 'paper-runbook';
export type IncidentId = 'shutter-failure' | 'reader-crawl' | 'dead-wifi' | 'schedule-drift';
export type SupportZoneId = 'backstage' | 'media';
export type SpecialistId = 'stage-documentary' | 'news-desk' | 'people-first';
export type UpgradeZoneId = StationId;
export type RumorId = 'group-photo-drift' | 'ten-photo-myth' | 'vip-no-photo' | 'raw-files-now';
export type CareerChoiceId = 'craft' | 'network' | 'leverage';
export type DilemmaChoiceId = 'absorb' | 'boundary' | 'delegate';
export type CareerDilemmaId =
  | 'raw-demand'
  | 'favor-insert'
  | 'credit-erasure'
  | 'young-rival'
  | 'body-warning'
  | 'silent-assistant';

export interface CareerTracks {
  craft: number;
  network: number;
  leverage: number;
}

export interface CareerVitals {
  stamina: number;
  trust: number;
  standing: number;
}

export interface WorkdayModifier {
  productionSeconds: number;
  handoffSeconds: number;
  specialistSeconds: number;
  clientOpening: number;
  clientGrowth: number;
  deadlineSeconds: number;
  rumorWindowSeconds: number;
}

export interface DilemmaOptionDefinition {
  id: DilemmaChoiceId;
  label: string;
  preview: string;
  aftermath: string;
  vitals: Partial<CareerVitals>;
  modifier: Partial<WorkdayModifier>;
}

export interface CareerDilemmaDefinition {
  id: CareerDilemmaId;
  minShift: number;
  title: string;
  body: string;
  weightFor?: CareerChoiceId;
  options: readonly DilemmaOptionDefinition[];
}

export interface CareerChoiceDefinition {
  id: CareerChoiceId;
  label: string;
  gain: string;
  debt: string;
}

export interface EquipmentDefinition {
  id: EquipmentId;
  label: string;
  shortLabel: string;
  purpose: string;
}

export interface IncidentDefinition {
  id: IncidentId;
  title: string;
  signal: string;
  station: ProductionStationId;
  equipment: EquipmentId;
  pressureTarget: StationId;
  pressurePenalty: number;
  deadlinePenalty: number;
  workDelay: number;
  containedCopy: string;
  exposedCopy: string;
}

export interface IncidentOutcome {
  incidentId: IncidentId;
  equipmentId: EquipmentId;
  title: string;
  mitigated: boolean;
  detail: string;
}

export interface SpecialistDefinition {
  id: SpecialistId;
  label: string;
  field: string;
  passive: string;
  favoredZone: SupportZoneId | 'client';
}

export interface RumorDefinition {
  id: RumorId;
  zone: SupportZoneId;
  line: string;
  pressureTarget: StationId;
  pressurePenalty: number;
  deadlinePenalty: number;
  resolvedCopy: string;
  exposedCopy: string;
}

export interface RumorOutcome {
  rumorId: RumorId;
  line: string;
  resolved: boolean;
  detail: string;
}

export interface RumorState {
  id: RumorId;
  phase: 'dormant' | 'active' | 'resolved' | 'escalated';
  remaining: number;
  checkedZones: SupportZoneId[];
}

export interface SpecialistAssignment {
  zone: SupportZoneId;
  phase: AssignmentPhase;
  remaining: number;
  total: number;
  rumorId: RumorId;
}

export interface JobBrief {
  id: JobBriefId;
  title: string;
  focus: string;
  cue: string;
  initialPressures: Record<StationId, number>;
  deadline: number;
  workDuration: Record<ProductionStationId, number>;
  clientGrowth: number;
}

export interface JobOutcome {
  smoothHandoffs: number;
  clientUpdates: number;
  clientEscalations: number;
  stageFailures: number;
  cleanWorkflow: boolean;
  workflowBuffer: number;
}

export interface CampaignProgress {
  shiftNumber: number;
  zoneUpgrades: Record<UpgradeZoneId, number>;
  careerTracks?: CareerTracks;
  careerVitals?: CareerVitals;
  recentDilemmas?: CareerDilemmaId[];
  preparedDilemma?: {
    shiftNumber: number;
    dilemmaId: CareerDilemmaId;
    choiceId: DilemmaChoiceId;
  } | null;
  nextShiftReady?: boolean;
}

export interface ProductionAssignment {
  station: ProductionStationId;
  phase: AssignmentPhase;
  remaining: number;
  total: number;
}

export interface ClientAssignment {
  phase: AssignmentPhase;
  remaining: number;
  total: number;
}

export interface HandoffPreparation extends ClientAssignment {
  station: ProductionStationId;
}

export interface LoopState {
  pressures: Record<StationId, number>;
  deadline: number;
  jobIndex: number;
  active: ProductionStationId;
  production: ProductionAssignment | null;
  queuedProduction: ProductionStationId | null;
  client: ClientAssignment | null;
  handoffPrep: HandoffPreparation | null;
  clientCooldown: number;
  completed: boolean;
  deliveredJobs: number;
  workflowBuffer: number;
  smoothHandoffs: number;
  clientUpdates: number;
  clientEscalations: number;
  stageFailures: number;
  lastOutcome: JobOutcome | null;
  shiftStarted: boolean;
  loadout: EquipmentId[];
  currentIncident: IncidentId | null;
  incidentTriggered: boolean;
  lastIncidentOutcome: IncidentOutcome | null;
  incidentHistory: IncidentOutcome[];
  specialist: SpecialistId | null;
  specialistAssignment: SpecialistAssignment | null;
  currentRumor: RumorState | null;
  lastRumorOutcome: RumorOutcome | null;
  rumorHistory: RumorOutcome[];
  jobElapsed: number;
  zoneUpgrades: Record<UpgradeZoneId, number>;
  upgradeChosenForJob: boolean;
  shiftNumber: number;
  careerTracks: CareerTracks;
  careerChoiceForShift: CareerChoiceId | null;
  careerVitals: CareerVitals;
  careerDilemmaId: CareerDilemmaId | null;
  dilemmaChoiceForShift: DilemmaChoiceId | null;
  recentDilemmas: CareerDilemmaId[];
  workdayModifier: WorkdayModifier;
}

export type DispatchResult =
  | { type: 'production-assigned'; station: ProductionStationId }
  | { type: 'handoff-prep-assigned'; station: ProductionStationId }
  | { type: 'client-assigned' }
  | { type: 'production-busy'; station: ProductionStationId }
  | { type: 'production-queue-busy'; station: ProductionStationId }
  | { type: 'handoff-prep-busy'; station: ProductionStationId }
  | { type: 'assistant-busy'; task: AssistantTask }
  | { type: 'handoff-not-ready'; station: ProductionStationId; next: ProductionStationId }
  | { type: 'client-busy' }
  | { type: 'client-cooling'; remaining: number }
  | { type: 'wrong-stage'; expected: ProductionStationId }
  | { type: 'shift-not-started' }
  | { type: 'job-complete' };

export type LoopEvent =
  | { type: 'production-complete'; station: ProductionStationId; next: ProductionStationId; autoStarted: boolean }
  | { type: 'handoff-prepared'; station: ProductionStationId }
  | { type: 'delivery-complete' }
  | { type: 'client-complete' }
  | { type: 'client-escalated' }
  | { type: 'incident-triggered'; outcome: IncidentOutcome }
  | { type: 'rumor-started'; rumor: RumorDefinition }
  | { type: 'rumor-checked'; zone: SupportZoneId }
  | { type: 'rumor-resolved'; outcome: RumorOutcome; zone: SupportZoneId }
  | { type: 'rumor-escalated'; outcome: RumorOutcome }
  | { type: 'stage-failed'; station: ProductionStationId };

export type SupportDispatchResult =
  | { type: 'specialist-assigned'; zone: SupportZoneId }
  | { type: 'specialist-busy'; zone: SupportZoneId }
  | { type: 'no-active-rumor' }
  | { type: 'shift-not-started' }
  | { type: 'job-complete' };

export const STAGE_ORDER: readonly ProductionStationId[] = ['capture', 'edit', 'delivery'];

export const EQUIPMENT: readonly EquipmentDefinition[] = [
  { id: 'backup-body', label: '備用機身', shortLabel: '備用機', purpose: '主機失靈時直接換機，保住拍攝節奏' },
  { id: 'dual-reader', label: '雙讀卡機', shortLabel: '雙讀卡', purpose: '單一讀卡通道失速時仍能繼續進檔' },
  { id: 'hotspot', label: '行動網路', shortLabel: '行動網路', purpose: '場館網路只有看起來正常時，保住交件' },
  { id: 'paper-runbook', label: '紙本流程表', shortLabel: '紙本流程', purpose: '口頭變更互相矛盾時，留下可核對的版本' },
];

export const SPECIALISTS: readonly SpecialistDefinition[] = [
  {
    id: 'stage-documentary',
    label: '舞台紀實攝影師',
    field: '熟悉彩排、走位與不能重來的瞬間',
    passive: '去側台查證更快；處理成功時額外穩住拍攝區',
    favoredZone: 'backstage',
  },
  {
    id: 'news-desk',
    label: '即時新聞攝影師',
    field: '懂發稿窗口、媒體需求與交件時效',
    passive: '去媒體席查證更快；處理成功時額外穩住交件區',
    favoredZone: 'media',
  },
  {
    id: 'people-first',
    label: '人物溝通攝影師',
    field: '擅長在混亂關係裡找到真正能決定的人',
    passive: '任何風聲被釐清時，都會同步降低客戶壓力',
    favoredZone: 'client',
  },
];

export const RUMORS: Readonly<Record<RumorId, RumorDefinition>> = {
  'group-photo-drift': {
    id: 'group-photo-drift',
    zone: 'backstage',
    line: '「大合照等等再補就好。」但三位主管已經準備離場。',
    pressureTarget: 'capture',
    pressurePenalty: 24,
    deadlinePenalty: 3,
    resolvedCopy: '側台重新確認離場順序，大合照被移回還拍得到的時間。',
    exposedCopy: '大家都以為別人會留人，真正要拍時只剩空舞台。',
  },
  'ten-photo-myth': {
    id: 'ten-photo-myth',
    zone: 'media',
    line: '隔壁團隊說：「主辦最後只會挑十張，不用那麼早交。」',
    pressureTarget: 'delivery',
    pressurePenalty: 26,
    deadlinePenalty: 4,
    resolvedCopy: '媒體席找到真正的發稿窗口：十張只是其中一個群組的需求。',
    exposedCopy: '閒聊被當成規格，等新聞稿催件時才發現交付根本不只十張。',
  },
  'vip-no-photo': {
    id: 'vip-no-photo',
    zone: 'backstage',
    line: '有人壓低聲音說：「那位長官今天不想被拍。」',
    pressureTarget: 'client',
    pressurePenalty: 28,
    deadlinePenalty: 3,
    resolvedCopy: '側台問到本人窗口：不是不拍，只是動線還沒有人說清楚。',
    exposedCopy: '一句沒有來源的話一路傳下去，所有人都在猜該不該舉起相機。',
  },
  'raw-files-now': {
    id: 'raw-files-now',
    zone: 'media',
    line: '公關群組突然問：「可以現在先傳未調色原檔嗎？」',
    pressureTarget: 'edit',
    pressurePenalty: 25,
    deadlinePenalty: 4,
    resolvedCopy: '媒體席對回用途，只需要三張即時預覽，不必把整批流程拆爛。',
    exposedCopy: '一句「先傳原檔」讓選圖、調色與交件順序全部打結。',
  },
};

export const INCIDENTS: Readonly<Record<IncidentId, IncidentDefinition>> = {
  'shutter-failure': {
    id: 'shutter-failure',
    title: '主機偏偏現在失靈',
    signal: '主機半按快門偶爾沒有反應，但送修說一切正常。',
    station: 'capture',
    equipment: 'backup-body',
    pressureTarget: 'capture',
    pressurePenalty: 24,
    deadlinePenalty: 3,
    workDelay: 3.5,
    containedCopy: '備用機身已經對時，攝影師直接換機；現場只停了一個呼吸。',
    exposedCopy: '唯一機身重新開機，拍攝窗口正在往前跑；這不是連點能救回來的時間。',
  },
  'reader-crawl': {
    id: 'reader-crawl',
    title: '讀卡機只剩 12 KB/s',
    signal: '讀卡桌只留了一個 USB 孔，器材說「應該夠用」。',
    station: 'edit',
    equipment: 'dual-reader',
    pressureTarget: 'edit',
    pressurePenalty: 26,
    deadlinePenalty: 4,
    workDelay: 4,
    containedCopy: '第二條讀卡通道立即接手，壞掉的那一條可以下班後再查。',
    exposedCopy: '進檔速度慢到像沒有在動，修圖只能等資料一張一張爬進來。',
  },
  'dead-wifi': {
    id: 'dead-wifi',
    title: 'Wi-Fi 滿格，但沒有網路',
    signal: '場館窗口說 Wi-Fi 沒問題，但沒有人真的傳過檔案。',
    station: 'delivery',
    equipment: 'hotspot',
    pressureTarget: 'delivery',
    pressurePenalty: 30,
    deadlinePenalty: 5,
    workDelay: 4.5,
    containedCopy: '行動網路接手上傳；滿格但不能用的 Wi-Fi 留在背景裡。',
    exposedCopy: '交件檔已經準備好，進度條卻完全不動；客戶只看得到時間正在消失。',
  },
  'schedule-drift': {
    id: 'schedule-drift',
    title: 'VIP 已在門口，流程表還沒改',
    signal: '流程表今天已被口頭改過兩次，但群組裡仍是舊版本。',
    station: 'capture',
    equipment: 'paper-runbook',
    pressureTarget: 'client',
    pressurePenalty: 32,
    deadlinePenalty: 6,
    workDelay: 1.5,
    containedCopy: '助理拿紙本版本逐項對回去，口頭變更終於有了可以追的順序。',
    exposedCopy: '每個人都記得不同版本，VIP 已經開始走；攝影師只能邊拍邊猜。',
  },
};

export const JOB_BRIEFS: readonly JobBrief[] = [
  {
    id: 'event',
    title: '品牌發表會',
    focus: '舞台＋媒體聯訪',
    cue: '舞台、媒體與公關各自拿著一份看起來都正確的流程',
    initialPressures: { capture: 18, edit: 5, delivery: 0, client: 16 },
    deadline: 78,
    workDuration: { capture: 5.8, edit: 7.2, delivery: 5.4 },
    clientGrowth: 1.82,
  },
  {
    id: 'portrait',
    title: '年度頒獎典禮',
    focus: '得獎人＋長官動線',
    cue: '名單一直在改，真正能決定拍攝順序的人還沒有出現',
    initialPressures: { capture: 12, edit: 12, delivery: 0, client: 42 },
    deadline: 84,
    workDuration: { capture: 8.4, edit: 8.8, delivery: 5.4 },
    clientGrowth: 2.2,
  },
  {
    id: 'rush',
    title: '千人晚宴',
    focus: '晚間即時發稿',
    cue: '所有人都說來得及，舞台、合照與發稿條件卻沒有人一起實測',
    initialPressures: { capture: 14, edit: 8, delivery: 32, client: 12 },
    deadline: 64,
    workDuration: { capture: 5.4, edit: 7.8, delivery: 6.2 },
    clientGrowth: 1.55,
  },
];

const EVENT_VARIANTS: readonly (readonly Pick<JobBrief, 'title' | 'focus' | 'cue'>[])[] = [
  [
    { title: '品牌發表會', focus: '舞台＋媒體聯訪', cue: '舞台、媒體與公關各自拿著一份看起來都正確的流程' },
    { title: '年度頒獎典禮', focus: '得獎人＋長官動線', cue: '名單一直在改，真正能決定拍攝順序的人還沒有出現' },
    { title: '千人晚宴', focus: '晚間即時發稿', cue: '所有人都說來得及，舞台、合照與發稿條件卻沒有人一起實測' },
  ],
  [
    { title: '超大型展場活動', focus: '雙館＋多區覆蓋', cue: '每一區都說拍完了，總表上卻還有攤位沒有任何紀錄' },
    { title: '大型記者會', focus: '長官＋即時發稿', cue: '致詞順序臨時對調，媒體群組仍在轉傳上一版流程' },
    { title: '企業家庭日', focus: '舞台＋全員合照', cue: '大家都說可以最後補拍，但接駁車會準時把人送走' },
  ],
  [
    { title: '國際論壇', focus: '多語窗口＋分流', cue: '三個窗口都能回答問題，卻沒有一個人能確認最後交付規格' },
    { title: '音樂節頒獎', focus: '舞台＋後台人物', cue: '表演、頒獎與採訪共用同一條狹窄動線' },
    { title: '年度尾牙', focus: '抽獎＋即時社群', cue: '流程一直往前趕，重要人物卻只在座位上停留幾分鐘' },
  ],
];

export const WORK_DURATION = JOB_BRIEFS[0]!.workDuration;

export const CLIENT_WORK_DURATION = 2.8;
export const HANDOFF_PREP_DURATION = 3.2;
const CLIENT_COOLDOWN = 8;
const LOADOUT_SIZE = 2;
const RUMOR_RESPONSE_WINDOW = 13;
const SUPPORT_WORK_DURATION = 3;

const NEUTRAL_WORKDAY_MODIFIER: WorkdayModifier = {
  productionSeconds: 0,
  handoffSeconds: 0,
  specialistSeconds: 0,
  clientOpening: 0,
  clientGrowth: 0,
  deadlineSeconds: 0,
  rumorWindowSeconds: 0,
};

export const CAREER_CHOICES: readonly CareerChoiceDefinition[] = [
  {
    id: 'craft',
    label: '技術流',
    gain: '製作更穩、更快',
    debt: '鑽研會吃掉休息，隔天截止更緊',
  },
  {
    id: 'network',
    label: '人脈流',
    gain: '風聲更早留下查證空間',
    debt: '人情債讓客戶期待升得更快',
  },
  {
    id: 'leverage',
    label: '情勒流',
    gain: '窗口更快被安撫',
    debt: '團隊信任受損，交接準備變慢',
  },
];

export const CAREER_DILEMMAS: readonly CareerDilemmaDefinition[] = [
  {
    id: 'raw-demand',
    minShift: 1,
    title: '群組先問：順利的話，可以連原檔一起給嗎？',
    body: '工作還沒開始，沒有用途、沒有張數，也沒有人願意把這句話寫進正式需求。',
    options: [
      {
        id: 'absorb',
        label: '先說可以，現場再想辦法',
        preview: '主線會衝得更快，但模糊承諾會讓窗口更容易追加。',
        aftermath: '你用體力填掉了沒寫進需求的工作；對方只記得你答應過。',
        vitals: { stamina: -1 },
        modifier: { productionSeconds: -0.3, clientGrowth: 0.2 },
      },
      {
        id: 'boundary',
        label: '先問用途，只承諾三張預覽',
        preview: '窗口一開始會不高興，但後面的需求不再無限長大。',
        aftermath: '你讓不舒服提早發生，換回一條可以交付的邊界。',
        vitals: { standing: 1 },
        modifier: { clientOpening: 9, clientGrowth: -0.2, deadlineSeconds: 3 },
      },
      {
        id: 'delegate',
        label: '拆一條快線，交給搭檔顧',
        preview: '交接多一層協調，但即時交付與現場查證都會更有餘裕。',
        aftermath: '你沒有把所有事抓在自己手上；團隊開始知道怎麼替你接住。',
        vitals: { trust: 1 },
        modifier: { handoffSeconds: 0.3, specialistSeconds: -0.55, deadlineSeconds: 2 },
      },
    ],
  },
  {
    id: 'favor-insert',
    minShift: 2,
    title: '熟人的熟人說：幫我插五張，不會耽誤你',
    body: '他沒有在正式群組，也不會替你向真正的窗口解釋為什麼交付順序變了。',
    weightFor: 'network',
    options: [
      {
        id: 'absorb',
        label: '先插單，這個人情以後再算',
        preview: '風聲會更早傳到你耳邊，但本來的截止時間不會等你。',
        aftermath: '人情真的留下了，只是記帳的人不是你。',
        vitals: { standing: -1 },
        modifier: { deadlineSeconds: -4, rumorWindowSeconds: 1.6 },
      },
      {
        id: 'boundary',
        label: '請他回正式窗口排順序',
        preview: '開場壓力會變高，但誰改了順序會留下紀錄。',
        aftermath: '群組安靜了幾秒；至少明天沒有人能說是你自己改的。',
        vitals: { standing: 1 },
        modifier: { clientOpening: 10, clientGrowth: -0.14 },
      },
      {
        id: 'delegate',
        label: '請搭檔先對用途，不先答應張數',
        preview: '交接需要多說一句，但錯誤需求更容易在進場前被拆掉。',
        aftermath: '搭檔擋下了那句「順便」；他也開始知道自己有權問為什麼。',
        vitals: { trust: 1 },
        modifier: { handoffSeconds: 0.25, specialistSeconds: -0.45, rumorWindowSeconds: 0.8 },
      },
    ],
  },
  {
    id: 'credit-erasure',
    minShift: 3,
    title: '結案簡報寫著「主辦團隊即時完成影像」',
    body: '你的名字不在裡面，但下一場出問題時，他們仍然會第一個打給你。',
    options: [
      {
        id: 'absorb',
        label: '不提了，能繼續合作比較重要',
        preview: '今天會比較好做，但市場更難知道真正是誰穩住現場。',
        aftermath: '合作留下來了，功勞沒有；下一次責任還是會找到你。',
        vitals: { standing: -1 },
        modifier: { deadlineSeconds: 4, clientOpening: -4 },
      },
      {
        id: 'boundary',
        label: '在群組補上影像責任與交付紀錄',
        preview: '窗口會感到被點名，但後續規格與責任比較不會消失。',
        aftermath: '沒有人道歉，但下一版文件終於出現了你的角色。',
        vitals: { standing: 1 },
        modifier: { clientOpening: 8, rumorWindowSeconds: 1.1 },
      },
      {
        id: 'delegate',
        label: '要求把整個影像團隊一起列入',
        preview: '你少拿一點個人光環，團隊會更願意主動補位。',
        aftermath: '名字不只剩你一個；下次也不再只有你一個人記得所有事。',
        vitals: { trust: 1 },
        modifier: { handoffSeconds: -0.2, clientGrowth: 0.08 },
      },
    ],
  },
  {
    id: 'young-rival',
    minShift: 4,
    title: '年輕攝影師報價只有六成，跑完整天還在幫大家收線',
    body: '客戶把他的報價截圖傳給你。他體力更好、情緒更穩，也暫時沒有舊傷。',
    options: [
      {
        id: 'absorb',
        label: '跟價，差額用自己的體力補',
        preview: '主線會被你硬拉快，但低價與追加需求會一起留下。',
        aftermath: '你守住了這一場，卻教會市場用更低的價格期待同一套結果。',
        vitals: { stamina: -1, standing: -1 },
        modifier: { productionSeconds: -0.25, clientGrowth: 0.24 },
      },
      {
        id: 'boundary',
        label: '守住報價，拿掉沒付費的內容',
        preview: '開場比較難談，但承諾會縮回你真正能交付的範圍。',
        aftermath: '客戶沒有立刻喜歡你；但他開始知道不同價格買到的不是同一件事。',
        vitals: { standing: 1 },
        modifier: { clientOpening: 11, clientGrowth: -0.22, deadlineSeconds: 4 },
      },
      {
        id: 'delegate',
        label: '把他拉進團隊，不把他當敵人',
        preview: '今天要多付協調成本，但你的判斷可以換成別人的體力。',
        aftermath: '你沒有贏過他的體力；你把那份體力接進了自己的流程。',
        vitals: { trust: 1, stamina: 1 },
        modifier: { productionSeconds: 0.2, handoffSeconds: 0.35, specialistSeconds: -0.75 },
      },
    ],
  },
  {
    id: 'body-warning',
    minShift: 5,
    title: '右手拇指開始發麻，醫師說不是休息一晚就會好',
    body: '今天仍然有人等你出圖。身體沒有跳出確認視窗，也不會替你按暫停。',
    weightFor: 'craft',
    options: [
      {
        id: 'absorb',
        label: '吞止痛，照原本速度做完',
        preview: '今天的速度看起來沒變，明天可用的身體會再少一點。',
        aftermath: '照片準時到了；麻木也留下來了。',
        vitals: { stamina: -1 },
        modifier: { productionSeconds: -0.35, deadlineSeconds: 2 },
      },
      {
        id: 'boundary',
        label: '縮小承諾，只守住必要交付',
        preview: '窗口會先追問，但需求一旦被排序，後面比較不會失控。',
        aftermath: '你第一次把「做不到全部」說在出事以前。',
        vitals: { standing: 1 },
        modifier: { clientOpening: 9, clientGrowth: -0.18, deadlineSeconds: 4 },
      },
      {
        id: 'delegate',
        label: '讓搭檔接一段，把手留給不能重來的畫面',
        preview: '交接會多花時間，但主攝不再是整條流程唯一的關節。',
        aftermath: '你少做了一段，團隊第一次多會了一段。',
        vitals: { stamina: 1, trust: 1 },
        modifier: { productionSeconds: 0.25, handoffSeconds: 0.25, specialistSeconds: -0.6 },
      },
    ],
  },
  {
    id: 'silent-assistant',
    minShift: 4,
    title: '助理在群組只回「收到」，不再主動提醒任何事',
    body: '以前他會補上你漏掉的下一步。現在每件事都等你說得一字不差。',
    weightFor: 'leverage',
    options: [
      {
        id: 'absorb',
        label: '算了，自己記住所有下一步',
        preview: '主線暫時不必磨合，但你的注意力會再少一塊。',
        aftermath: '今天沒有人吵架；也沒有人再替你多想一步。',
        vitals: { stamina: -1, trust: -1 },
        modifier: { productionSeconds: -0.15, clientGrowth: 0.14, rumorWindowSeconds: -0.8 },
      },
      {
        id: 'boundary',
        label: '把責任與決定權重新說清楚',
        preview: '今天的交接會慢一點，但沉默不再被當成服從。',
        aftermath: '談話很難看；下一次助理終於又問了一句「那下一站呢？」',
        vitals: { trust: 1 },
        modifier: { handoffSeconds: 0.45, rumorWindowSeconds: 0.7 },
      },
      {
        id: 'delegate',
        label: '讓他自己負責一條交付線',
        preview: '你會失去一部分即時控制，團隊則可能重新長出判斷。',
        aftermath: '他做法和你不完全一樣，但那條線沒有再等你批准每一步。',
        vitals: { trust: 1, standing: -1 },
        modifier: { productionSeconds: -0.15, handoffSeconds: 0.2, specialistSeconds: -0.4 },
      },
    ],
  },
];

const INCIDENT_POOLS: Readonly<Record<JobBriefId, readonly IncidentId[]>> = {
  event: ['schedule-drift', 'shutter-failure', 'reader-crawl'],
  portrait: ['shutter-failure', 'schedule-drift', 'dead-wifi'],
  rush: ['dead-wifi', 'reader-crawl', 'schedule-drift'],
};

function jobBrief(index: number): JobBrief {
  return JOB_BRIEFS[index] ?? JOB_BRIEFS[0]!;
}

function initialPressures(jobIndex: number, workflowBuffer: number): Record<StationId, number> {
  const relief = workflowBuffer * 4;
  const profile = jobBrief(jobIndex).initialPressures;
  return {
    capture: Math.max(0, profile.capture - relief),
    edit: Math.max(0, profile.edit - relief),
    delivery: Math.max(0, profile.delivery - relief),
    client: Math.max(0, profile.client - relief),
  };
}

function equipmentDefinition(id: EquipmentId): EquipmentDefinition {
  return EQUIPMENT.find((item) => item.id === id) ?? EQUIPMENT[0]!;
}

function specialistDefinition(id: SpecialistId): SpecialistDefinition {
  return SPECIALISTS.find((item) => item.id === id) ?? SPECIALISTS[0]!;
}

function createIncidentPlan(rng: () => number): IncidentId[] {
  const used = new Set<IncidentId>();
  return JOB_BRIEFS.map((brief) => {
    const pool = INCIDENT_POOLS[brief.id];
    const available = pool.filter((id) => !used.has(id));
    const choices = available.length > 0 ? available : pool;
    const index = Math.min(choices.length - 1, Math.floor(Math.max(0, rng()) * choices.length));
    const selected = choices[index] ?? choices[0]!;
    used.add(selected);
    return selected;
  });
}

function createSignalOrder(rng: () => number): IncidentId[] {
  const signals = Object.keys(INCIDENTS) as IncidentId[];
  for (let index = signals.length - 1; index > 0; index -= 1) {
    const target = Math.min(index, Math.floor(Math.max(0, rng()) * (index + 1)));
    [signals[index], signals[target]] = [signals[target]!, signals[index]!];
  }
  return signals;
}

function shuffledIds<T>(ids: readonly T[], rng: () => number): T[] {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.min(index, Math.floor(Math.max(0, rng()) * (index + 1)));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

function createRumorPlan(rng: () => number): RumorId[] {
  return shuffledIds(Object.keys(RUMORS) as RumorId[], rng).slice(0, JOB_BRIEFS.length);
}

function clampVital(value: number): number {
  return Math.max(0, Math.min(6, Math.floor(value)));
}

function workdayModifier(value: Partial<WorkdayModifier> = {}): WorkdayModifier {
  return { ...NEUTRAL_WORKDAY_MODIFIER, ...value };
}

export class AriadneLoop {
  private incidentPlan: IncidentId[] = [];
  private signalOrder: IncidentId[] = [];
  private rumorPlan: RumorId[] = [];
  private rumorTriggerPlan: number[] = [];
  private eventVariantPlan: Pick<JobBrief, 'title' | 'focus' | 'cue'>[] = [];

  public readonly state: LoopState = {
    pressures: initialPressures(0, 0),
    deadline: JOB_BRIEFS[0]!.deadline,
    jobIndex: 0,
    active: 'capture',
    production: null,
    queuedProduction: null,
    client: null,
    handoffPrep: null,
    clientCooldown: 0,
    completed: false,
    deliveredJobs: 0,
    workflowBuffer: 0,
    smoothHandoffs: 0,
    clientUpdates: 0,
    clientEscalations: 0,
    stageFailures: 0,
    lastOutcome: null,
    shiftStarted: true,
    loadout: [],
    currentIncident: null,
    incidentTriggered: false,
    lastIncidentOutcome: null,
    incidentHistory: [],
    specialist: null,
    specialistAssignment: null,
    currentRumor: null,
    lastRumorOutcome: null,
    rumorHistory: [],
    jobElapsed: 0,
    zoneUpgrades: { capture: 0, edit: 0, delivery: 0, client: 0 },
    upgradeChosenForJob: false,
    shiftNumber: 1,
    careerTracks: { craft: 0, network: 0, leverage: 0 },
    careerChoiceForShift: null,
    careerVitals: { stamina: 3, trust: 3, standing: 3 },
    careerDilemmaId: null,
    dilemmaChoiceForShift: null,
    recentDilemmas: [],
    workdayModifier: { ...NEUTRAL_WORKDAY_MODIFIER },
  };

  public constructor(private readonly rng: () => number = Math.random) {}

  private briefFor(index: number, shiftNumber: number): JobBrief {
    const base = jobBrief(index);
    const fixedCycle = EVENT_VARIANTS[(Math.max(1, shiftNumber) - 1) % EVENT_VARIANTS.length] ?? EVENT_VARIANTS[0]!;
    const variant = this.eventVariantPlan[index] ?? fixedCycle[index] ?? fixedCycle[0]!;
    return { ...base, ...variant };
  }

  public currentBrief(): JobBrief {
    return this.briefFor(this.state.jobIndex, this.state.shiftNumber);
  }

  public nextBrief(): JobBrief {
    return this.briefFor((this.state.jobIndex + 1) % JOB_BRIEFS.length, this.state.shiftNumber);
  }

  public currentWorkDuration(station: ProductionStationId): number {
    const reductions: Record<ProductionStationId, number> = { capture: 0.7, edit: 1, delivery: 0.8 };
    const craftRelief = this.state.careerTracks.craft * 0.28;
    const fatigueCost = Math.max(0, 3 - this.state.careerVitals.stamina) * 0.24;
    return Math.max(
      3.5,
      this.currentBrief().workDuration[station]
        - this.state.zoneUpgrades[station] * reductions[station]
        - craftRelief
        + fatigueCost
        + this.state.workdayModifier.productionSeconds,
    );
  }

  public clientWorkDuration(): number {
    return Math.max(1.8, CLIENT_WORK_DURATION - this.state.careerTracks.leverage * 0.18);
  }

  public handoffWorkDuration(): number {
    const trustDelta = this.state.careerVitals.trust >= 3
      ? -(this.state.careerVitals.trust - 3) * 0.12
      : (3 - this.state.careerVitals.trust) * 0.18;
    return Math.max(
      2.2,
      HANDOFF_PREP_DURATION
        + this.state.careerTracks.leverage * 0.22
        + trustDelta
        + this.state.workdayModifier.handoffSeconds,
    );
  }

  public careerStageLabel(): string {
    if (this.state.shiftNumber >= 8) return '資深現場統籌';
    if (this.state.shiftNumber >= 4) return '現場主力';
    return '還在證明自己';
  }

  public careerConditionCopy(): string {
    const { stamina, trust, standing } = this.state.careerVitals;
    const staminaCopy = stamina >= 4 ? '仍有餘裕' : stamina >= 2 ? '開始透支' : '身體在追債';
    const trustCopy = trust >= 4 ? '主動補位' : trust >= 2 ? '照指令做' : '團隊沉默';
    const standingCopy = standing >= 4 ? '能守範圍' : standing >= 2 ? '反覆議價' : '報價被錨定';
    return `體力 ${staminaCopy} · 團隊 ${trustCopy} · 議價 ${standingCopy}`;
  }

  public currentCareerDilemma(): CareerDilemmaDefinition | null {
    return CAREER_DILEMMAS.find((item) => item.id === this.state.careerDilemmaId) ?? null;
  }

  public selectedDilemmaOption(): DilemmaOptionDefinition | null {
    return this.currentCareerDilemma()?.options.find((item) => item.id === this.state.dilemmaChoiceForShift) ?? null;
  }

  public isShiftComplete(): boolean {
    return this.state.completed
      && this.state.deliveredJobs > 0
      && this.state.deliveredJobs % JOB_BRIEFS.length === 0;
  }

  public prepareShift(): void {
    this.state.shiftNumber = 1;
    this.state.zoneUpgrades = { capture: 0, edit: 0, delivery: 0, client: 0 };
    this.state.careerTracks = { craft: 0, network: 0, leverage: 0 };
    this.state.careerVitals = { stamina: 3, trust: 3, standing: 3 };
    this.state.recentDilemmas = [];
    this.setupShift();
  }

  public prepareNextShift(): void {
    this.state.shiftNumber += 1;
    if (this.state.shiftNumber >= 5 && this.state.shiftNumber % 2 === 1) {
      this.state.careerVitals.stamina = clampVital(this.state.careerVitals.stamina - 1);
    }
    this.setupShift();
  }

  public restoreCampaign(progress: CampaignProgress): boolean {
    if (!Number.isFinite(progress.shiftNumber) || progress.shiftNumber < 1) return false;
    const zones = Object.keys(this.state.zoneUpgrades) as UpgradeZoneId[];
    if (!zones.every((zone) => Number.isFinite(progress.zoneUpgrades?.[zone]))) return false;
    const savedShift = Math.max(1, Math.floor(progress.shiftNumber));
    const advanceCompletedShift = progress.nextShiftReady === true;
    this.state.shiftNumber = savedShift + (advanceCompletedShift ? 1 : 0);
    for (const zone of zones) {
      this.state.zoneUpgrades[zone] = Math.max(0, Math.min(2, Math.floor(progress.zoneUpgrades[zone])));
    }
    const restoredTracks = progress.careerTracks ?? { craft: 0, network: 0, leverage: 0 };
    for (const choice of CAREER_CHOICES) {
      const level = restoredTracks[choice.id];
      this.state.careerTracks[choice.id] = Number.isFinite(level)
        ? Math.max(0, Math.min(4, Math.floor(level)))
        : 0;
    }
    const restoredVitals = progress.careerVitals ?? { stamina: 3, trust: 3, standing: 3 };
    for (const vital of ['stamina', 'trust', 'standing'] as const) {
      const value = restoredVitals[vital];
      this.state.careerVitals[vital] = Number.isFinite(value) ? clampVital(value) : 3;
    }
    if (advanceCompletedShift && this.state.shiftNumber >= 5 && this.state.shiftNumber % 2 === 1) {
      this.state.careerVitals.stamina = clampVital(this.state.careerVitals.stamina - 1);
    }
    this.state.recentDilemmas = (progress.recentDilemmas ?? [])
      .filter((id): id is CareerDilemmaId => CAREER_DILEMMAS.some((item) => item.id === id))
      .slice(-3);
    const prepared = advanceCompletedShift ? null : progress.preparedDilemma;
    const preferredDilemma = prepared?.shiftNumber === this.state.shiftNumber
      && CAREER_DILEMMAS.some((item) => item.id === prepared.dilemmaId)
      ? prepared.dilemmaId
      : undefined;
    this.setupShift(preferredDilemma);
    if (prepared?.shiftNumber === this.state.shiftNumber && prepared.dilemmaId === this.state.careerDilemmaId) {
      this.restoreDilemmaChoice(prepared.choiceId);
    }
    return true;
  }

  public campaignProgress(): CampaignProgress {
    return {
      shiftNumber: this.state.shiftNumber,
      zoneUpgrades: { ...this.state.zoneUpgrades },
      careerTracks: { ...this.state.careerTracks },
      careerVitals: { ...this.state.careerVitals },
      recentDilemmas: [...this.state.recentDilemmas],
      preparedDilemma: this.state.careerDilemmaId && this.state.dilemmaChoiceForShift
        && !(this.isShiftComplete() && this.state.careerChoiceForShift)
        ? {
            shiftNumber: this.state.shiftNumber,
            dilemmaId: this.state.careerDilemmaId,
            choiceId: this.state.dilemmaChoiceForShift,
          }
        : null,
      nextShiftReady: this.isShiftComplete() && Boolean(this.state.careerChoiceForShift),
    };
  }

  public applyCareerChoice(choice: CareerChoiceId): boolean {
    if (!this.isShiftComplete() || this.state.careerChoiceForShift) return false;
    if (!(choice in this.state.careerTracks)) return false;
    this.state.careerTracks[choice] = Math.min(4, this.state.careerTracks[choice] + 1);
    this.state.careerChoiceForShift = choice;
    return true;
  }

  public chooseDilemma(choiceId: DilemmaChoiceId): boolean {
    if (this.state.shiftStarted || this.state.dilemmaChoiceForShift) return false;
    const dilemma = this.currentCareerDilemma();
    const option = dilemma?.options.find((item) => item.id === choiceId);
    if (!dilemma || !option) return false;
    this.state.dilemmaChoiceForShift = choiceId;
    this.state.workdayModifier = workdayModifier(option.modifier);
    for (const vital of ['stamina', 'trust', 'standing'] as const) {
      this.state.careerVitals[vital] = clampVital(
        this.state.careerVitals[vital] + (option.vitals[vital] ?? 0),
      );
    }
    this.state.recentDilemmas = [...this.state.recentDilemmas.filter((id) => id !== dilemma.id), dilemma.id].slice(-3);
    this.resetOpeningState();
    return true;
  }

  private setupShift(preferredDilemma?: CareerDilemmaId): void {
    this.incidentPlan = createIncidentPlan(this.rng);
    this.signalOrder = createSignalOrder(this.rng);
    this.rumorPlan = createRumorPlan(this.rng);
    this.rumorTriggerPlan = JOB_BRIEFS.map(() => 4.2 + Math.max(0, this.rng()) * 2.6);
    this.eventVariantPlan = this.createEventVariantPlan();
    this.state.shiftStarted = false;
    this.state.loadout = [];
    this.state.currentIncident = null;
    this.state.incidentTriggered = false;
    this.state.lastIncidentOutcome = null;
    this.state.incidentHistory = [];
    this.state.specialist = null;
    this.state.specialistAssignment = null;
    this.state.currentRumor = null;
    this.state.lastRumorOutcome = null;
    this.state.rumorHistory = [];
    this.state.jobElapsed = 0;
    this.state.upgradeChosenForJob = false;
    this.state.careerChoiceForShift = null;
    this.state.careerDilemmaId = preferredDilemma ?? this.selectCareerDilemma();
    this.state.dilemmaChoiceForShift = null;
    this.state.workdayModifier = { ...NEUTRAL_WORKDAY_MODIFIER };
    this.state.jobIndex = 0;
    this.state.active = 'capture';
    this.state.production = null;
    this.state.queuedProduction = null;
    this.state.client = null;
    this.state.handoffPrep = null;
    this.state.clientCooldown = 0;
    this.state.completed = false;
    this.state.deliveredJobs = 0;
    this.state.workflowBuffer = 0;
    this.state.smoothHandoffs = 0;
    this.state.clientUpdates = 0;
    this.state.clientEscalations = 0;
    this.state.stageFailures = 0;
    this.state.lastOutcome = null;
    this.resetOpeningState();
  }

  private createEventVariantPlan(): Pick<JobBrief, 'title' | 'focus' | 'cue'>[] {
    if (this.state.shiftNumber <= EVENT_VARIANTS.length) {
      return [...(EVENT_VARIANTS[this.state.shiftNumber - 1] ?? EVENT_VARIANTS[0]!)];
    }
    return JOB_BRIEFS.map((_, index) => {
      const column = EVENT_VARIANTS.map((cycle) => cycle[index]!).filter(Boolean);
      const selected = Math.min(column.length - 1, Math.floor(Math.max(0, this.rng()) * column.length));
      return column[selected] ?? column[0]!;
    });
  }

  private selectCareerDilemma(): CareerDilemmaId {
    const eligible = CAREER_DILEMMAS.filter((item) => item.minShift <= this.state.shiftNumber);
    const fresh = eligible.filter((item) => !this.state.recentDilemmas.includes(item.id));
    const pool = fresh.length > 0 ? fresh : eligible;
    const weighted = pool.flatMap((item) => {
      const weight = item.weightFor ? 1 + this.state.careerTracks[item.weightFor] : 1;
      return Array.from({ length: weight }, () => item);
    });
    const index = Math.min(weighted.length - 1, Math.floor(Math.max(0, this.rng()) * weighted.length));
    return (weighted[index] ?? CAREER_DILEMMAS[0]!).id;
  }

  private restoreDilemmaChoice(choiceId: DilemmaChoiceId): void {
    const option = this.currentCareerDilemma()?.options.find((item) => item.id === choiceId);
    if (!option) return;
    this.state.dilemmaChoiceForShift = choiceId;
    this.state.workdayModifier = workdayModifier(option.modifier);
    this.resetOpeningState();
  }

  private resetOpeningState(): void {
    this.state.pressures = initialPressures(0, 0);
    this.applyCareerOpeningPressure();
    this.state.deadline = this.careerAdjustedDeadline();
  }

  public preflightSignals(): string[] {
    return this.signalOrder.map((id) => INCIDENTS[id].signal);
  }

  public configureLoadout(ids: readonly EquipmentId[]): boolean {
    if (this.state.shiftStarted) return false;
    const unique = [...new Set(ids)].filter((id): id is EquipmentId => EQUIPMENT.some((item) => item.id === id));
    if (unique.length !== LOADOUT_SIZE) return false;
    this.state.loadout = unique;
    return true;
  }

  public configureSpecialist(id: SpecialistId): boolean {
    if (this.state.shiftStarted || !SPECIALISTS.some((item) => item.id === id)) return false;
    this.state.specialist = id;
    return true;
  }

  public startShift(): boolean {
    if (
      this.state.loadout.length !== LOADOUT_SIZE
      || !this.state.specialist
      || !this.state.dilemmaChoiceForShift
      || this.incidentPlan.length !== JOB_BRIEFS.length
      || this.rumorPlan.length !== JOB_BRIEFS.length
    ) return false;
    this.state.shiftStarted = true;
    this.state.currentIncident = this.incidentPlan[this.state.jobIndex] ?? null;
    this.state.currentRumor = this.rumorStateForJob(this.state.jobIndex);
    return true;
  }

  public equipmentLabel(id: EquipmentId): string {
    return equipmentDefinition(id).shortLabel;
  }

  public currentIncidentDefinition(): IncidentDefinition | null {
    return this.state.currentIncident ? INCIDENTS[this.state.currentIncident] : null;
  }

  public specialistDefinition(): SpecialistDefinition | null {
    return this.state.specialist ? specialistDefinition(this.state.specialist) : null;
  }

  public currentRumorDefinition(): RumorDefinition | null {
    return this.state.currentRumor ? RUMORS[this.state.currentRumor.id] : null;
  }

  public applyZoneUpgrade(zone: UpgradeZoneId): boolean {
    if (!this.state.completed || this.isShiftComplete() || this.state.upgradeChosenForJob) return false;
    if (!(zone in this.state.zoneUpgrades) || this.state.zoneUpgrades[zone] >= 2) return false;
    this.state.zoneUpgrades[zone] += 1;
    this.state.upgradeChosenForJob = true;
    return true;
  }

  public dispatchSupport(zone: SupportZoneId): SupportDispatchResult {
    if (!this.state.shiftStarted) return { type: 'shift-not-started' };
    if (this.state.completed) return { type: 'job-complete' };
    if (this.state.specialistAssignment) {
      return { type: 'specialist-busy', zone: this.state.specialistAssignment.zone };
    }
    const rumor = this.state.currentRumor;
    if (!rumor || rumor.phase !== 'active') return { type: 'no-active-rumor' };

    const specialist = this.specialistDefinition();
    const favored = specialist?.favoredZone === zone;
    const baseDuration = favored ? 1.8 : SUPPORT_WORK_DURATION;
    const trustRelief = Math.max(0, this.state.careerVitals.trust - 3) * 0.1;
    const duration = Math.max(
      1.2,
      baseDuration + this.state.workdayModifier.specialistSeconds - trustRelief,
    );
    this.state.specialistAssignment = {
      zone,
      phase: 'moving',
      remaining: duration,
      total: duration,
      rumorId: rumor.id,
    };
    return { type: 'specialist-assigned', zone };
  }

  public reachSpecialistZone(): void {
    if (this.state.specialistAssignment?.phase === 'moving') this.state.specialistAssignment.phase = 'working';
  }

  public dispatch(id: StationId): DispatchResult {
    if (!this.state.shiftStarted) return { type: 'shift-not-started' };
    if (this.state.completed) return { type: 'job-complete' };

    if (id === 'client') {
      if (this.state.client) return { type: 'client-busy' };
      if (this.state.handoffPrep) return { type: 'assistant-busy', task: 'handoff' };
      if (this.state.clientCooldown > 0) {
        return { type: 'client-cooling', remaining: this.state.clientCooldown };
      }

      this.state.client = {
        phase: 'moving',
        remaining: this.clientWorkDuration(),
        total: this.clientWorkDuration(),
      };
      return { type: 'client-assigned' };
    }

    const production = this.state.production;
    if (production) {
      if (id === production.station) return { type: 'production-busy', station: production.station };

      const next = STAGE_ORDER[STAGE_ORDER.indexOf(this.state.active) + 1];
      if (!next) return { type: 'wrong-stage', expected: this.state.active };
      if (production.phase === 'moving') {
        return { type: 'handoff-not-ready', station: production.station, next };
      }
      if (id !== next) return { type: 'wrong-stage', expected: next };
      if (this.state.queuedProduction === id) return { type: 'production-queue-busy', station: id };
      if (this.state.handoffPrep?.station === id) return { type: 'handoff-prep-busy', station: id };
      if (this.state.client) return { type: 'assistant-busy', task: 'client' };

      this.state.handoffPrep = {
        station: id,
        phase: 'moving',
        remaining: this.handoffWorkDuration(),
        total: this.handoffWorkDuration(),
      };
      return { type: 'handoff-prep-assigned', station: id };
    }

    if (id !== this.state.active) return { type: 'wrong-stage', expected: this.state.active };

    this.state.production = {
      station: id,
      phase: 'moving',
      remaining: this.currentWorkDuration(id),
      total: this.currentWorkDuration(id),
    };
    return { type: 'production-assigned', station: id };
  }

  public reachProductionStation(): void {
    if (this.state.production?.phase === 'moving') this.state.production.phase = 'working';
  }

  public reachClientStation(): void {
    if (this.state.client?.phase === 'moving') this.state.client.phase = 'working';
  }

  public reachHandoffStation(): void {
    if (this.state.handoffPrep?.phase === 'moving') this.state.handoffPrep.phase = 'working';
  }

  public tick(dt: number): LoopEvent[] {
    if (!this.state.shiftStarted || this.state.completed || dt <= 0) return [];

    const events: LoopEvent[] = [];
    this.state.jobElapsed += dt;
    this.state.clientCooldown = Math.max(0, this.state.clientCooldown - dt);

    events.push(...this.updateRumor(dt));

    for (const station of STAGE_ORDER) {
      const isActive = station === this.state.active;
      const isNext = STAGE_ORDER.indexOf(station) === STAGE_ORDER.indexOf(this.state.active) + 1;
      const growth = isActive ? 1.18 : isNext ? 0.18 : 0;
      const workingRelief = this.state.production?.station === station && this.state.production.phase === 'working' ? -1.45 : 0;
      const prepRelief = this.state.handoffPrep?.station === station && this.state.handoffPrep.phase === 'working' ? -0.72 : 0;
      this.state.pressures[station] = this.clamp(this.state.pressures[station] + dt * (growth + workingRelief + prepRelief));
    }

    const clientUpgradeMultiplier = Math.pow(0.86, this.state.zoneUpgrades.client);
    const networkExpectation = this.state.careerTracks.network * 0.06;
    const clientGrowth = this.state.client?.phase === 'working'
      ? 0.35
      : Math.max(
          0.35,
          this.currentBrief().clientGrowth * clientUpgradeMultiplier
            + networkExpectation
            + this.state.workdayModifier.clientGrowth,
        );
    this.state.pressures.client = this.clamp(this.state.pressures.client + dt * clientGrowth);

    if (this.state.handoffPrep?.phase === 'working') {
      this.state.handoffPrep.remaining = Math.max(0, this.state.handoffPrep.remaining - dt);
      if (this.state.handoffPrep.remaining <= 0) {
        const station = this.state.handoffPrep.station;
        this.state.handoffPrep = null;
        this.state.queuedProduction = station;
        this.state.pressures[station] = Math.max(0, this.state.pressures[station] - 10);
        events.push({ type: 'handoff-prepared', station });
      }
    }

    if (this.state.client?.phase === 'working') {
      this.state.client.remaining = Math.max(0, this.state.client.remaining - dt);
      if (this.state.client.remaining <= 0) {
        this.state.client = null;
        this.state.clientCooldown = CLIENT_COOLDOWN;
        const leverageRelief = this.state.careerTracks.leverage * 4;
        this.state.pressures.client = Math.max(0, this.state.pressures.client - 52 - leverageRelief);
        this.state.clientUpdates += 1;
        events.push({ type: 'client-complete' });
      }
    }

    events.push(...this.maybeTriggerIncident());

    if (this.state.production?.phase === 'working') {
      this.state.production.remaining = Math.max(0, this.state.production.remaining - dt);
      if (this.state.production.remaining <= 0) events.push(...this.finishProduction());
    }

    const averagePressure = this.averagePressure();
    this.state.deadline -= dt * (averagePressure >= 70 ? 1.3 : 1);

    if (this.state.pressures.client >= 100) {
      this.state.pressures.client = 62;
      this.state.deadline -= 8;
      this.state.clientEscalations += 1;
      events.push({ type: 'client-escalated' });
    }

    if (this.state.pressures[this.state.active] >= 100 || this.state.deadline <= 0) {
      const failed = this.state.active;
      this.state.production = null;
      this.state.queuedProduction = null;
      this.state.handoffPrep = null;
      this.state.pressures[failed] = 42;
      this.state.deadline = Math.max(18, this.state.deadline + 20);
      this.state.pressures.client = this.clamp(this.state.pressures.client + 14);
      this.state.stageFailures += 1;
      events.push({ type: 'stage-failed', station: failed });
    }

    return events;
  }

  public startNextJob(): void {
    this.state.jobIndex = (this.state.jobIndex + 1) % JOB_BRIEFS.length;
    this.state.pressures = initialPressures(this.state.jobIndex, this.state.workflowBuffer);
    this.applyCareerOpeningPressure();
    this.state.deadline = this.careerAdjustedDeadline() + this.state.workflowBuffer * 4;
    this.state.active = 'capture';
    this.state.production = null;
    this.state.queuedProduction = null;
    this.state.client = null;
    this.state.handoffPrep = null;
    this.state.clientCooldown = 0;
    this.state.completed = false;
    this.state.smoothHandoffs = 0;
    this.state.clientUpdates = 0;
    this.state.clientEscalations = 0;
    this.state.stageFailures = 0;
    this.state.currentIncident = this.incidentPlan[this.state.jobIndex] ?? null;
    this.state.incidentTriggered = false;
    this.state.lastIncidentOutcome = null;
    this.state.specialistAssignment = null;
    this.state.currentRumor = this.rumorStateForJob(this.state.jobIndex);
    this.state.lastRumorOutcome = null;
    this.state.jobElapsed = 0;
    this.state.upgradeChosenForJob = false;
  }

  public averagePressure(): number {
    const values = Object.values(this.state.pressures);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private maybeTriggerIncident(): LoopEvent[] {
    const incident = this.currentIncidentDefinition();
    const production = this.state.production;
    if (!incident || this.state.incidentTriggered || production?.phase !== 'working') return [];
    if (production.station !== incident.station) return [];

    const progress = 1 - production.remaining / production.total;
    if (progress < 0.34) return [];

    this.state.incidentTriggered = true;
    const mitigated = this.state.loadout.includes(incident.equipment);
    if (mitigated) {
      this.state.pressures[incident.pressureTarget] = Math.max(
        0,
        this.state.pressures[incident.pressureTarget] - 6,
      );
    } else {
      this.state.pressures[incident.pressureTarget] = this.clamp(
        this.state.pressures[incident.pressureTarget] + incident.pressurePenalty,
      );
      this.state.deadline = Math.max(0, this.state.deadline - incident.deadlinePenalty);
      production.remaining += incident.workDelay;
      production.total += incident.workDelay;
    }

    const outcome: IncidentOutcome = {
      incidentId: incident.id,
      equipmentId: incident.equipment,
      title: incident.title,
      mitigated,
      detail: mitigated ? incident.containedCopy : incident.exposedCopy,
    };
    this.state.lastIncidentOutcome = outcome;
    this.state.incidentHistory.push(outcome);
    return [{ type: 'incident-triggered', outcome }];
  }

  private rumorStateForJob(jobIndex: number): RumorState | null {
    const id = this.rumorPlan[jobIndex];
    const networkWindow = this.state.careerTracks.network * 0.7;
    const responseWindow = Math.max(
      7,
      RUMOR_RESPONSE_WINDOW + networkWindow + this.state.workdayModifier.rumorWindowSeconds,
    );
    return id ? { id, phase: 'dormant', remaining: responseWindow, checkedZones: [] } : null;
  }

  private updateRumor(dt: number): LoopEvent[] {
    const events: LoopEvent[] = [];
    const rumor = this.state.currentRumor;
    if (!rumor) return events;
    let activatedNow = false;

    const triggerAt = this.rumorTriggerPlan[this.state.jobIndex] ?? 5;
    if (rumor.phase === 'dormant' && this.state.jobElapsed >= triggerAt) {
      rumor.phase = 'active';
      activatedNow = true;
      events.push({ type: 'rumor-started', rumor: RUMORS[rumor.id] });
    }

    const assignment = this.state.specialistAssignment;
    if (assignment?.phase === 'working') {
      assignment.remaining = Math.max(0, assignment.remaining - dt);
      if (assignment.remaining <= 0) {
        this.state.specialistAssignment = null;
        const definition = RUMORS[assignment.rumorId];
        if (rumor.phase === 'active' && definition.zone === assignment.zone) {
          rumor.phase = 'resolved';
          this.state.pressures[definition.pressureTarget] = Math.max(
            0,
            this.state.pressures[definition.pressureTarget] - 10,
          );
          this.applySpecialistRelief(assignment.zone);
          const outcome: RumorOutcome = {
            rumorId: rumor.id,
            line: definition.line,
            resolved: true,
            detail: definition.resolvedCopy,
          };
          this.state.lastRumorOutcome = outcome;
          this.state.rumorHistory.push(outcome);
          events.push({ type: 'rumor-resolved', outcome, zone: assignment.zone });
        } else {
          if (!rumor.checkedZones.includes(assignment.zone)) rumor.checkedZones.push(assignment.zone);
          events.push({ type: 'rumor-checked', zone: assignment.zone });
        }
      }
    }

    if (rumor.phase === 'active' && !activatedNow) {
      rumor.remaining = Math.max(0, rumor.remaining - dt);
      if (rumor.remaining <= 0) {
        const definition = RUMORS[rumor.id];
        rumor.phase = 'escalated';
        this.state.specialistAssignment = null;
        this.state.pressures[definition.pressureTarget] = this.clamp(
          this.state.pressures[definition.pressureTarget] + definition.pressurePenalty,
        );
        this.state.deadline = Math.max(0, this.state.deadline - definition.deadlinePenalty);
        const outcome: RumorOutcome = {
          rumorId: rumor.id,
          line: definition.line,
          resolved: false,
          detail: definition.exposedCopy,
        };
        this.state.lastRumorOutcome = outcome;
        this.state.rumorHistory.push(outcome);
        events.push({ type: 'rumor-escalated', outcome });
      }
    }

    return events;
  }

  private applySpecialistRelief(zone: SupportZoneId): void {
    const specialist = this.specialistDefinition();
    if (!specialist) return;
    if (specialist.id === 'stage-documentary' && zone === 'backstage') {
      this.state.pressures.capture = Math.max(0, this.state.pressures.capture - 12);
    } else if (specialist.id === 'news-desk' && zone === 'media') {
      this.state.pressures.delivery = Math.max(0, this.state.pressures.delivery - 12);
    } else if (specialist.id === 'people-first') {
      this.state.pressures.client = Math.max(0, this.state.pressures.client - 16);
    }
  }

  private finishProduction(): LoopEvent[] {
    const completed = this.state.production?.station;
    if (!completed) return [];

    this.state.pressures[completed] = Math.max(0, this.state.pressures[completed] - 44);
    const index = STAGE_ORDER.indexOf(completed);
    const next = STAGE_ORDER[index + 1];

    if (!next) {
      this.state.production = null;
      this.state.queuedProduction = null;
      this.state.handoffPrep = null;
      this.state.completed = true;
      this.state.deliveredJobs += 1;
      const cleanWorkflow = this.state.smoothHandoffs === 2
        && this.state.clientUpdates > 0
        && this.state.clientEscalations === 0
        && this.state.stageFailures === 0;
      this.state.workflowBuffer = cleanWorkflow
        ? Math.min(2, this.state.workflowBuffer + 1)
        : Math.max(0, this.state.workflowBuffer - 1);
      this.state.lastOutcome = {
        smoothHandoffs: this.state.smoothHandoffs,
        clientUpdates: this.state.clientUpdates,
        clientEscalations: this.state.clientEscalations,
        stageFailures: this.state.stageFailures,
        cleanWorkflow,
        workflowBuffer: this.state.workflowBuffer,
      };
      this.state.client = null;
      this.state.clientCooldown = 0;
      this.state.pressures = { capture: 0, edit: 0, delivery: 0, client: 0 };
      return [{ type: 'delivery-complete' }];
    }

    this.state.active = next;
    this.state.deadline += 10;
    const autoStarted = this.state.queuedProduction === next;
    if (autoStarted) this.state.smoothHandoffs += 1;
    this.state.queuedProduction = null;
    this.state.handoffPrep = null;
    this.state.production = autoStarted
      ? {
          station: next,
          phase: 'moving',
          remaining: this.currentWorkDuration(next),
          total: this.currentWorkDuration(next),
        }
      : null;
    return [{ type: 'production-complete', station: completed, next, autoStarted }];
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private careerAdjustedDeadline(): number {
    return Math.max(
      30,
      this.currentBrief().deadline
        - this.state.careerTracks.craft * 0.8
        + this.state.workdayModifier.deadlineSeconds,
    );
  }

  private applyCareerOpeningPressure(): void {
    const accessRelief = this.state.careerTracks.network * 2;
    const standing = this.state.careerVitals.standing;
    const standingPressure = standing >= 3 ? -(standing - 3) * 2 : (3 - standing) * 4;
    this.state.pressures.client = this.clamp(
      this.state.pressures.client
        - accessRelief
        + standingPressure
        + this.state.workdayModifier.clientOpening,
    );
  }
}
