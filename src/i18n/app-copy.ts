import type { AppLanguage } from '@/context/AppLanguageContext';

export type AppCopyKey =
  | 'home'
  | 'lesson'
  | 'materials'
  | 'channel'
  | 'quizzes'
  | 'about'
  | 'aboutSubtitle'
  | 'ourMission'
  | 'whoWeAre'
  | 'meetTeam'
  | 'platformCreators'
  | 'educationalAdvisors'
  | 'communityMembers'
  | 'noMembersAdded'
  | 'missionAlt'
  | 'teamCollaborationAlt'
  | 'astronomicalObservationAlt'
  | 'missionFallback'
  | 'whoWeAreFallback1'
  | 'whoWeAreFallback2'
  | 'yourProgress'
  | 'trackJourney'
  | 'lessonsCompleted'
  | 'overallProgress'
  | 'achievements'
  | 'progressByTopic'
  | 'noTopicsYet'
  | 'firstSteps'
  | 'risingStar'
  | 'spaceExplorer'
  | 'cosmicScholar'
  | 'astronomyMaster'
  | 'universalExpert'
  | 'yourBookmarks'
  | 'noBookmarksYet'
  | 'startBookmarking'
  | 'exploreTopics'
  | 'goToLesson'
  | 'removeBookmark'
  | 'loadingBookmarks'
  | 'loadingProgress'
  | 'progressLoadError'
  | 'signIn'
  | 'exploreCosmos'
  | 'joinCommunity'
  | 'logoEmblem'
  | 'exploreUniverse'
  | 'structuredLessons'
  | 'heroVideo'
  | 'invalidVideoUrl'
  | 'videoUnsupported'
  | 'beginJourney'
  | 'learnMore'
  | 'featuredTopics'
  | 'viewAllTopics'
  | 'searchTopics'
  | 'clearSearch'
  | 'loadingTopics'
  | 'loadingLessonResults'
  | 'lessons'
  | 'couldNotLoadTopics'
  | 'pleaseRefresh'
  | 'noTopics'
  | 'topicDescriptionFallback'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'learning'
  | 'topics'
  | 'noResults'
  | 'loading'
  | 'loadingLesson'
  | 'lessonNotFound'
  | 'errorLoadingLesson'
  | 'lessonIllustration'
  | 'lessonImageUnavailable'
  | 'pleaseLogInBookmark'
  | 'failedUpdateBookmark'
  | 'failedMarkComplete'
  | 'backToTopic'
  | 'previousLesson'
  | 'nextLesson'
  | 'completeTopic'
  | 'bookmark'
  | 'bookmarked'
  | 'markComplete'
  | 'completed'
  | 'astronomyTests'
  | 'errorLoadingQuizzes'
  | 'testYourKnowledge'
  | 'selectQuiz'
  | 'noQuizzes'
  | 'quizNoQuestions'
  | 'backToQuizzes'
  | 'score'
  | 'question'
  | 'of'
  | 'nextQuestion'
  | 'finish'
  | 'testComplete'
  | 'perfectScore'
  | 'goodJob'
  | 'keepStudying'
  | 'takeTestAgain'
  | 'chooseAnotherQuiz'
  | 'yourAnswer'
  | 'correctAnswer'
  | 'explanation'
  | 'materialsLibrary'
  | 'exploreCollection'
  | 'all'
  | 'browseByCategory'
  | 'categories'
  | 'photos'
  | 'item'
  | 'items'
  | 'searchMaterialCategories'
  | 'noCategories'
  | 'backToCategories'
  | 'visitSource'
  | 'galleryImage'
  | 'directVideoFormat'
  | 'openNewTab'
  | 'photoGallery'
  | 'videos'
  | 'downloads'
  | 'open'
  | 'download'
  | 'noMaterials'
  | 'language'
  | 'navigation'
  | 'myProgress'
  | 'bookmarks'
  | 'themes'
  | 'active'
  | 'baseThemes'
  | 'darkTheme'
  | 'lightTheme'
  | 'linearGradients'
  | 'offlineStorage'
  | 'preparingOffline'
  | 'offlineDownloadFailed'
  | 'closeUpdateOptions'
  | 'updateReady'
  | 'chooseUseEthio'
  | 'updateOfflineDescription'
  | 'onlineDescription'
  | 'preparing'
  | 'offlineReady'
  | 'offlineItemSaved'
  | 'useUpdateOnline'
  | 'useOnlineVersion'
  | 'downloadForOffline'
  | 'notDownloaded'
  | 'ready'
  | 'activeStatus'
  | 'error'
  | 'member'
  | 'members'
  | 'signOut'
  | 'adminPanel'
  | 'superAdmin'
  | 'manageLessons'
  | 'languageHelper'
  | 'teacher'
  | 'tutor'
  | 'quizCoach'
  | 'online'
  | 'currentLesson'
  | 'teacherReady'
  | 'aiLessonTutor'
  | 'groundedIn'
  | 'newTutorConversation'
  | 'tutorMode'
  | 'tutorLanguage'
  | 'explainSimply'
  | 'keyIdeas'
  | 'realExample'
  | 'startQuiz'
  | 'giveHint'
  | 'harderQuestion'
  | 'tutorGuidance'
  | 'quizGuidance'
  | 'voiceOutputUnavailable'
  | 'textAnswerAvailable'
  | 'readTutorAloud'
  | 'tutorThinking'
  | 'muteTutorVoice'
  | 'enableTutorVoice'
  | 'sendTutorQuestion'
  | 'muteAIVoice'
  | 'enableAIVoice'
  | 'teacherMode'
  | 'voiceRecordingUnsupported'
  | 'noAudioRecorded'
  | 'voiceTranscriptionFailed'
  | 'microphoneRecordingFailed'
  | 'micPermissionRequired'
  | 'microphoneUnavailable'
  | 'listeningStatus'
  | 'transcribingStatus'
  | 'stopVoiceRecording'
  | 'startVoiceRecording'
  | 'chatError'
  | 'tutorUnavailable'
  | 'tryAgain'
  | 'welcome'
  | 'askAnything'
  | 'askAboutLesson'
  | 'askYourTeacher'
  | 'answerOrHint'
  | 'readAloud'
  | 'voiceOn'
  | 'voiceOff'
  | 'solarSystem'
  | 'solarSystemShort'
  | 'solarSystemIntro'
  | 'orbitColorEffects'
  | 'simulationControls'
  | 'dragToRotate'
  | 'pinchToZoom'
  | 'tapPlanet'
  | 'resetView'
  | 'pauseSimulation'
  | 'playSimulation'
  | 'selectedPlanet'
  | 'distanceFromSun'
  | 'diameter'
  | 'orbitalPeriod'
  | 'noPlanetSelected'
  | 'planetSun'
  | 'planetMercury'
  | 'planetVenus'
  | 'planetEarth'
  | 'planetMars'
  | 'planetJupiter'
  | 'planetSaturn'
  | 'planetUranus'
  | 'planetNeptune'
  | 'planetPluto'
  | 'sourcePlanets'
  | 'sourceBack'
  | 'sourceControlsHint'
  | 'sourceScale'
  | 'sourceMoons'
  | 'sourceLoading'
  | 'premiumRequiredTitle'
  | 'premiumRequiredBody'
  | 'premiumManualMode'
  | 'backToLearning'
  | 'close';

const COPY: Record<AppLanguage, Record<AppCopyKey, string>> = {
  en: {
    home: 'Home',
    lesson: 'Lesson',
    materials: 'Materials',
    channel: 'Channel',
    quizzes: 'Quizzes',
    about: 'About',
    aboutSubtitle: 'Inspiring the next generation of Ethiopian astronomers and space enthusiasts.',
    ourMission: 'Our Mission',
    whoWeAre: 'Who We Are',
    meetTeam: 'Meet the Team',
    platformCreators: 'Platform Creators',
    educationalAdvisors: 'Educational Advisors',
    communityMembers: 'Community Members',
    noMembersAdded: 'No members added to this section yet.',
    missionAlt: 'Our Mission',
    teamCollaborationAlt: 'Team collaboration',
    astronomicalObservationAlt: 'Astronomical observation',
    missionFallback: 'Our mission is to democratize astronomy education in Ethiopia, making the wonders of the universe accessible to everyone through innovative digital learning and community engagement.',
    whoWeAreFallback1: 'Ethio-Cosmos is a community-driven platform created by passionate astronomers, educators, and developers who want to share their love for the stars with the world.',
    whoWeAreFallback2: 'We combine modern educational techniques with Ethiopia\'s rich astronomical heritage to create a unique learning experience that honors both science and culture.',
    yourProgress: 'Your Progress',
    trackJourney: 'Track your journey through the cosmos',
    lessonsCompleted: 'Lessons Completed',
    overallProgress: 'Overall Progress',
    achievements: 'Achievements',
    progressByTopic: 'Progress by Topic',
    noTopicsYet: 'No topics yet.',
    firstSteps: 'First Steps',
    risingStar: 'Rising Star',
    spaceExplorer: 'Space Explorer',
    cosmicScholar: 'Cosmic Scholar',
    astronomyMaster: 'Astronomy Master',
    universalExpert: 'Universal Expert',
    yourBookmarks: 'Your Bookmarks',
    noBookmarksYet: 'No bookmarks yet',
    startBookmarking: 'Start reading lessons and bookmark your favorites!',
    exploreTopics: 'Explore Topics',
    goToLesson: 'Go to Lesson',
    removeBookmark: 'Remove bookmark',
    loadingBookmarks: 'Loading bookmarks...',
    loadingProgress: 'Loading your progress...',
    progressLoadError: 'Failed to load progress. Please try again.',
    signIn: 'Sign In',
    exploreCosmos: 'Explore the Cosmos with Ethiopia',
    joinCommunity: 'Join the EthioCosmos Learning Community',
    logoEmblem: 'EthioCosmos Logo Emblem',
    exploreUniverse: 'Explore the Universe',
    structuredLessons: 'From the basics of stargazing to the mysteries of black holes, discover the wonders of astronomy through our structured lessons.',
    heroVideo: 'Hero Video',
    invalidVideoUrl: 'Invalid video URL',
    videoUnsupported: 'Your browser does not support the video tag.',
    beginJourney: 'Begin Your Journey',
    learnMore: 'Learn More',
    featuredTopics: 'Featured Topics',
    viewAllTopics: 'View All Topics',
    searchTopics: 'Search topics and lessons...',
    clearSearch: 'Clear search',
    loadingTopics: 'Loading topics...',
    loadingLessonResults: 'Loading lesson search results...',
    lessons: 'Lessons',
    couldNotLoadTopics: 'Could not load topics',
    pleaseRefresh: 'Please try refreshing the page or contact support if the problem persists.',
    noTopics: 'No topics available yet. Check back soon!',
    topicDescriptionFallback: 'Explore this astronomy topic and discover the wonders of the cosmos.',
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced',
    learning: 'Learning',
    topics: 'Topics',
    noResults: 'No results found.',
    loading: 'Loading...',
    loadingLesson: 'Loading lesson...',
    lessonNotFound: 'Lesson Not Found',
    errorLoadingLesson: 'Error loading lesson:',
    lessonIllustration: 'Lesson illustration',
    lessonImageUnavailable: 'Lesson image not available',
    pleaseLogInBookmark: 'Please log in to bookmark lessons.',
    failedUpdateBookmark: 'Failed to update bookmark. Please try again.',
    failedMarkComplete: 'Failed to mark lesson complete. Please try again.',
    backToTopic: 'Back to Topic',
    previousLesson: 'Previous Lesson',
    nextLesson: 'Next Lesson',
    completeTopic: 'Complete Topic',
    bookmark: 'Bookmark',
    bookmarked: 'Bookmarked',
    markComplete: 'Mark Complete',
    completed: 'Completed',
    astronomyTests: 'Astronomy Tests',
    errorLoadingQuizzes: 'Error loading quizzes:',
    testYourKnowledge: 'Test your knowledge of the cosmos',
    selectQuiz: 'Select a Quiz',
    noQuizzes: 'No quizzes available yet. Check back soon!',
    quizNoQuestions: 'This quiz has no questions yet. Check back soon!',
    backToQuizzes: 'Back to Quizzes',
    score: 'Score',
    question: 'Question',
    of: 'of',
    nextQuestion: 'Next Question',
    finish: 'Finish',
    testComplete: 'Test Complete!',
    perfectScore: 'Perfect score! You are a true astronomer!',
    goodJob: 'Good job! Keep learning!',
    keepStudying: 'Keep studying the cosmos!',
    takeTestAgain: 'Take Test Again',
    chooseAnotherQuiz: 'Choose Another Quiz',
    yourAnswer: 'Your answer',
    correctAnswer: 'Correct answer',
    explanation: 'Explanation',
    materialsLibrary: 'Materials Library',
    exploreCollection: 'Explore our collection of photos, videos, and downloadable resources',
    all: 'All',
    browseByCategory: 'Browse by Category',
    categories: 'Categories',
    photos: 'Photos',
    item: 'item',
    items: 'items',
    searchMaterialCategories: 'Search video groups or material categories...',
    noCategories: 'No categories or materials found for this filter.',
    backToCategories: 'Back to categories',
    visitSource: 'Visit Source',
    galleryImage: 'Gallery image',
    directVideoFormat: 'This video format cannot be played directly.',
    openNewTab: 'Open in New Tab',
    photoGallery: 'Photo Gallery',
    videos: 'Videos',
    downloads: 'Downloads',
    open: 'Open',
    download: 'Download',
    noMaterials: 'No materials available yet.',
    language: 'Language',
    navigation: 'Navigation',
    myProgress: 'My Progress',
    bookmarks: 'Bookmarks',
    themes: 'Themes',
    active: 'Active',
    baseThemes: 'Base Themes',
    darkTheme: 'Dark Theme',
    lightTheme: 'Light Theme',
    linearGradients: 'Linear Gradients',
    offlineStorage: 'Offline Storage',
    preparingOffline: 'Preparing offline content...',
    offlineDownloadFailed: 'Offline download failed.',
    closeUpdateOptions: 'Close update and offline options',
    updateReady: 'A new EthioCosmos update is ready',
    chooseUseEthio: 'Choose how to use EthioCosmos',
    updateOfflineDescription: 'Use the current update online, or load it and download the available content for offline use.',
    onlineDescription: 'Use the current version online, or download the available content now for offline access.',
    preparing: 'Preparing...',
    offlineReady: 'Offline content is ready on this device.',
    offlineItemSaved: 'Saved for offline use.',
    useUpdateOnline: 'Use update online',
    useOnlineVersion: 'Use online version',
    downloadForOffline: 'Download for offline',
    notDownloaded: 'Not downloaded',
    ready: 'Ready',
    activeStatus: 'Active',
    error: 'Error',
    member: 'Member',
    members: 'Members',
    signOut: 'Sign Out',
    adminPanel: 'Admin Panel',
    superAdmin: 'Super Admin',
    manageLessons: 'Manage Lessons',
    languageHelper: 'Changes teacher replies without changing the original lesson content.',
    teacher: 'Teacher',
    tutor: 'Tutor',
    quizCoach: 'Quiz Coach',
    online: 'Online',
    currentLesson: 'Current lesson',
    teacherReady: 'Your lesson teacher is ready',
    aiLessonTutor: 'AI Lesson Tutor',
    groundedIn: 'Grounded in',
    newTutorConversation: 'Start a new tutor conversation',
    tutorMode: 'Tutor mode',
    tutorLanguage: 'Tutor language',
    explainSimply: 'Explain this lesson simply',
    keyIdeas: 'What are the key ideas?',
    realExample: 'Give me a real example',
    startQuiz: 'Start a quiz',
    giveHint: 'Give me a hint',
    harderQuestion: 'Ask me a harder question',
    tutorGuidance: 'Ask for a simple explanation, an example, or the key ideas from this lesson.',
    quizGuidance: 'Ask me to start a quiz. I will give one question at a time and wait for your attempt.',
    voiceOutputUnavailable: 'Voice output is unavailable on this device. The text answer is still available.',
    textAnswerAvailable: 'Responses remain available as text even when voice is muted.',
    readTutorAloud: 'Read the tutor response aloud',
    tutorThinking: 'Tutor is thinking',
    muteTutorVoice: 'Mute tutor voice',
    enableTutorVoice: 'Enable tutor voice',
    sendTutorQuestion: 'Send tutor question',
    muteAIVoice: 'Mute AI voice',
    enableAIVoice: 'Enable AI voice',
    teacherMode: 'Teacher mode',
    voiceRecordingUnsupported: 'Voice recording is not supported on this device.',
    noAudioRecorded: 'No audio was recorded. Please try again.',
    voiceTranscriptionFailed: 'Voice transcription failed.',
    microphoneRecordingFailed: 'Microphone recording failed. Please try again.',
    micPermissionRequired: 'Microphone permission is required for voice input.',
    microphoneUnavailable: 'Microphone is unavailable. Please try again.',
    listeningStatus: 'Listening… tap the microphone to stop.',
    transcribingStatus: 'Transcribing your question…',
    stopVoiceRecording: 'Stop voice recording',
    startVoiceRecording: 'Start voice recording',
    chatError: 'Sorry, I encountered an error. Please try again.',
    tutorUnavailable: 'The tutor could not respond right now.',
    tryAgain: 'Please try again.',
    welcome: 'Welcome to Ethio-Cosmos!',
    askAnything: 'Ask me anything about astronomy or our community.',
    askAboutLesson: 'Ask me about this lesson.',
    askYourTeacher: 'Ask your teacher...',
    answerOrHint: 'Answer or ask for a hint...',
    readAloud: 'Read aloud',
    voiceOn: 'Voice on',
    voiceOff: 'Voice off',
    solarSystem: 'Solar System',
    solarSystemShort: 'Explore the planets',
    solarSystemIntro: 'Explore a lightweight interactive model of our solar system.',
    orbitColorEffects: 'Orbit color effects',
    simulationControls: 'Simulation controls',
    dragToRotate: 'Drag to rotate',
    pinchToZoom: 'Pinch to zoom',
    tapPlanet: 'Tap a planet to learn more',
    resetView: 'Reset view',
    pauseSimulation: 'Pause simulation',
    playSimulation: 'Play simulation',
    selectedPlanet: 'Selected planet',
    distanceFromSun: 'Distance from Sun',
    diameter: 'Diameter',
    orbitalPeriod: 'Orbital period',
    noPlanetSelected: 'Tap a planet to see details.',
    planetSun: 'Sun',
    planetMercury: 'Mercury',
    planetVenus: 'Venus',
    planetEarth: 'Earth',
    planetMars: 'Mars',
    planetJupiter: 'Jupiter',
    planetSaturn: 'Saturn',
    planetUranus: 'Uranus',
    planetNeptune: 'Neptune',
    planetPluto: 'Pluto',
    sourcePlanets: 'Planets',
    sourceBack: 'Back to EthioCosmos',
    sourceControlsHint: 'Drag to orbit · pinch or scroll to zoom · tap a planet to focus',
    sourceScale: 'Scale modeled from astronomical data',
    sourceMoons: 'Moons',
    sourceLoading: 'Building the Solar System…',
    premiumRequiredTitle: 'Premium access required',
    premiumRequiredBody: 'This feature is available with Premium. Subscribe when checkout is connected, or ask an administrator to grant access.',
    premiumManualMode: 'Subscription checkout is not connected yet. An administrator can grant Premium manually in the Admin dashboard.',
    backToLearning: 'Back to learning',
    close: 'Close',
  },
  am: {
    home: 'መነሻ',
    lesson: 'ትምህርት',
    materials: 'የትምህርት መርጃዎች',
    channel: 'ቻናል',
    quizzes: 'ፈተናዎች',
    about: 'ስለ እኛ',
    aboutSubtitle: 'የኢትዮጵያ የሥነ ፈለክ ተመራማሪዎችንና የህዋ አድናቂዎችን ቀጣይ ትውልድ ማነሳሳት።',
    ourMission: 'ተልዕኳችን',
    whoWeAre: 'እኛ ማን ነን',
    meetTeam: 'ቡድኑን ያግኙ',
    platformCreators: 'የመድረኩ ፈጣሪዎች',
    educationalAdvisors: 'የትምህርት አማካሪዎች',
    communityMembers: 'የማህበረሰብ አባላት',
    noMembersAdded: 'እስካሁን በዚህ ክፍል ምንም አባል አልተጨመረም።',
    missionAlt: 'ተልዕኳችን',
    teamCollaborationAlt: 'የቡድን ትብብር',
    astronomicalObservationAlt: 'የሥነ ፈለክ ምልከታ',
    missionFallback: 'ተልዕኳችን የአጽናፈ ዓለምን ድንቅ በፈጠራ ዲጂታል ትምህርትና በማህበረሰብ ተሳትፎ ለሁሉም ተደራሽ በማድረግ የሥነ ፈለክ ትምህርትን በኢትዮጵያ ማስፋፋት ነው።',
    whoWeAreFallback1: 'ኢትዮ-ኮስሞስ ለከዋክብት ያላቸውን ፍቅር ለዓለም ማካፈል በሚፈልጉ ቀናተኛ የሥነ ፈለክ ተመራማሪዎች፣ አስተማሪዎችና አዘጋጆች የተፈጠረ በማህበረሰብ የሚመራ መድረክ ነው።',
    whoWeAreFallback2: 'ዘመናዊ የትምህርት ዘዴዎችን ከኢትዮጵያ የበለጸገ የሥነ ፈለክ ቅርስ ጋር በማጣመር ሳይንስንና ባህልን የሚያከብር ልዩ የመማሪያ ልምድ እንፈጥራለን።',
    yourProgress: 'የእርስዎ እድገት',
    trackJourney: 'በኮስሞስ ውስጥ ያሉትን የጉዞ እድገቶች ይከታተሉ',
    lessonsCompleted: 'የተጠናቀቁ ትምህርቶች',
    overallProgress: 'አጠቃላይ እድገት',
    achievements: 'ስኬቶች',
    progressByTopic: 'እድገት በርዕስ',
    noTopicsYet: 'እስካሁን ርዕስ የለም።',
    firstSteps: 'የመጀመሪያ እርምጃዎች',
    risingStar: 'እየበራ ያለ ኮከብ',
    spaceExplorer: 'የህዋ አሳሽ',
    cosmicScholar: 'የኮስሞስ ምሁር',
    astronomyMaster: 'የሥነ ፈለክ ባለሙያ',
    universalExpert: 'የአጽናፈ ዓለም ባለሙያ',
    yourBookmarks: 'የእርስዎ ዕልባቶች',
    noBookmarksYet: 'እስካሁን ዕልባት የለም',
    startBookmarking: 'ትምህርቶችን ማንበብ ይጀምሩና የሚወዷቸውን ዕልባት ያድርጉ!',
    exploreTopics: 'ርዕሶችን ያስሱ',
    goToLesson: 'ወደ ትምህርት ሂድ',
    removeBookmark: 'ዕልባት አስወግድ',
    loadingBookmarks: 'ዕልባቶች በመጫን ላይ...',
    loadingProgress: 'የእርስዎ እድገት በመጫን ላይ ነው...',
    progressLoadError: 'እድገትን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    signIn: 'ግባ',
    exploreCosmos: 'ከኢትዮጵያ እስከ ኮስሞስ ይጓዙ',
    joinCommunity: 'የኢትዮኮስሞስ የመማሪያ ማኅበረሰብን ይቀላቀሉ',
    logoEmblem: 'የኢትዮኮስሞስ አርማ',
    exploreUniverse: 'ኮስሞስን ያስሱ',
    structuredLessons: 'ከዋክብትን ከመመልከት መሠረታዊ እውቀት እስከ ጥቁር ቀዳዳዎች ምስጢር ድረስ፣ በተዋቀሩ ትምህርቶቻችን የሥነ ፈለክን ድንቅ ይወቁ።',
    heroVideo: 'የመነሻ ቪዲዮ',
    invalidVideoUrl: 'ልክ ያልሆነ የቪዲዮ አድራሻ',
    videoUnsupported: 'አሳሽዎ የቪዲዮ መለያውን አይደግፍም።',
    beginJourney: 'ጉዞዎን ይጀምሩ',
    learnMore: 'ተጨማሪ ይወቁ',
    featuredTopics: 'ተመራጭ ርዕሶች',
    viewAllTopics: 'ሁሉንም ርዕሶች ይመልከቱ',
    searchTopics: 'ርዕሶችንና ትምህርቶችን ይፈልጉ...',
    clearSearch: 'ፍለጋን አጽዳ',
    loadingTopics: 'ርዕሶች በመጫን ላይ...',
    loadingLessonResults: 'የትምህርት ፍለጋ ውጤቶች በመጫን ላይ...',
    lessons: 'ትምህርቶች',
    couldNotLoadTopics: 'ርዕሶች ሊጫኑ አልቻሉም',
    pleaseRefresh: 'እባክዎ ገጹን ያድሱ፤ ችግሩ ከቀጠለ ድጋፍን ያነጋግሩ።',
    noTopics: 'እስካሁን ርዕስ የለም። ቆይተው ይመለሱ!',
    topicDescriptionFallback: 'ይህን የሥነ ፈለክ ርዕስ በማስሰስ የኮስሞስን ድንቅ ይወቁ።',
    beginner: 'ጀማሪ',
    intermediate: 'መካከለኛ',
    advanced: 'ከፍተኛ',
    learning: 'መማር',
    topics: 'ርዕሶች',
    noResults: 'ምንም ውጤት አልተገኘም።',
    loading: 'በመጫን ላይ...',
    loadingLesson: 'ትምህርቱ በመጫን ላይ ነው...',
    lessonNotFound: 'ትምህርቱ አልተገኘም',
    errorLoadingLesson: 'ትምህርቱን በመጫን ላይ ስህተት ተፈጥሯል፦',
    lessonIllustration: 'የትምህርቱ ምስል',
    lessonImageUnavailable: 'የትምህርቱ ምስል አይገኝም',
    pleaseLogInBookmark: 'ትምህርቶችን ለማስቀመጥ እባክዎ ይግቡ።',
    failedUpdateBookmark: 'ዕልባቱን ማዘመን አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    failedMarkComplete: 'ትምህርቱን እንደተጠናቀቀ ምልክት ማድረግ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    backToTopic: 'ወደ ርዕሱ ተመለስ',
    previousLesson: 'ያለፈው ትምህርት',
    nextLesson: 'ቀጣዩ ትምህርት',
    completeTopic: 'ርዕሱን ጨርስ',
    bookmark: 'አስቀምጥ',
    bookmarked: 'ተቀምጧል',
    markComplete: 'ተጠናቋል ብለህ ምልክት አድርግ',
    completed: 'ተጠናቋል',
    astronomyTests: 'የሥነ ፈለክ ፈተናዎች',
    errorLoadingQuizzes: 'ፈተናዎችን በመጫን ላይ ስህተት ተፈጥሯል፦',
    testYourKnowledge: 'ስለ ኮስሞስ ያለዎትን እውቀት ይፈትኑ',
    selectQuiz: 'ፈተና ይምረጡ',
    noQuizzes: 'እስካሁን ፈተና አልተገኘም። ቆይተው ይመለሱ!',
    quizNoQuestions: 'ይህ ፈተና እስካሁን ጥያቄ የለውም። ቆይተው ይመለሱ!',
    backToQuizzes: 'ወደ ፈተናዎች ተመለስ',
    score: 'ውጤት',
    question: 'ጥያቄ',
    of: 'ከ',
    nextQuestion: 'ቀጣዩ ጥያቄ',
    finish: 'ጨርስ',
    testComplete: 'ፈተናው ተጠናቋል!',
    perfectScore: 'ፍጹም ውጤት! እውነተኛ የሥነ ፈለክ ተመራማሪ ነዎት!',
    goodJob: 'ጥሩ ሥራ! መማርዎን ይቀጥሉ!',
    keepStudying: 'ኮስሞስን ማጥናትዎን ይቀጥሉ!',
    takeTestAgain: 'ፈተናውን እንደገና ይውሰዱ',
    chooseAnotherQuiz: 'ሌላ ፈተና ይምረጡ',
    yourAnswer: 'የእርስዎ መልስ',
    correctAnswer: 'ትክክለኛ መልስ',
    explanation: 'ማብራሪያ',
    materialsLibrary: 'የትምህርት መርጃ ቤተ መጽሐፍት',
    exploreCollection: 'የፎቶዎች፣ ቪዲዮዎችና ሊወርዱ የሚችሉ መርጃዎችን ስብስብ ያስሱ',
    all: 'ሁሉም',
    browseByCategory: 'በምድብ ያስሱ',
    categories: 'ምድቦች',
    photos: 'ፎቶዎች',
    item: 'እቃ',
    items: 'እቃዎች',
    searchMaterialCategories: 'የቪዲዮ ቡድኖችን ወይም የመርጃ ምድቦችን ይፈልጉ...',
    noCategories: 'ለዚህ ማጣሪያ ምንም ምድብ ወይም መርጃ አልተገኘም።',
    backToCategories: 'ወደ ምድቦች ተመለስ',
    visitSource: 'ምንጩን ይጎብኙ',
    galleryImage: 'የማዕከሉ ምስል',
    directVideoFormat: 'ይህ የቪዲዮ ቅርጸት በቀጥታ ሊጫወት አይችልም።',
    openNewTab: 'በአዲስ ትር ክፈት',
    photoGallery: 'የፎቶ ማዕከል',
    videos: 'ቪዲዮዎች',
    downloads: 'የሚወርዱ ፋይሎች',
    open: 'ክፈት',
    download: 'አውርድ',
    noMaterials: 'እስካሁን ምንም የትምህርት መርጃ የለም።',
    language: 'ቋንቋ',
    navigation: 'አሰሳ',
    myProgress: 'የእኔ እድገት',
    bookmarks: 'የተቀመጡ',
    themes: 'ገጽታዎች',
    active: 'ንቁ',
    baseThemes: 'መሠረታዊ ገጽታዎች',
    darkTheme: 'ጨለማ ገጽታ',
    lightTheme: 'ብሩህ ገጽታ',
    linearGradients: 'ቀጥተኛ የቀለም ድብልቆች',
    offlineStorage: 'ያለ ኢንተርኔት ማከማቻ',
    preparingOffline: 'ያለ ኢንተርኔት ይዘት በማዘጋጀት ላይ...',
    offlineDownloadFailed: 'ያለ ኢንተርኔት ማውረድ አልተሳካም።',
    closeUpdateOptions: 'የማዘመኛና ያለ ኢንተርኔት አማራጮችን ዝጋ',
    updateReady: 'አዲስ የኢትዮኮስሞስ ማዘመኛ ዝግጁ ነው',
    chooseUseEthio: 'ኢትዮኮስሞስን እንዴት ለመጠቀም ይምረጡ',
    updateOfflineDescription: 'የአሁኑን ማዘመኛ በመስመር ላይ ይጠቀሙ ወይም ይጫኑትና ያሉትን ይዘቶች ያለ ኢንተርኔት ለመጠቀም ያውርዱ።',
    onlineDescription: 'የአሁኑን ስሪት በመስመር ላይ ይጠቀሙ ወይም ይዘቶችን አሁን ያውርዱና ያለ ኢንተርኔት ይጠቀሙ።',
    preparing: 'በማዘጋጀት ላይ...',
    offlineReady: 'ያለ ኢንተርኔት ይዘት በዚህ መሣሪያ ላይ ዝግጁ ነው።',
    offlineItemSaved: 'ያለ ኢንተርኔት ለመጠቀም ተቀምጧል።',
    useUpdateOnline: 'ማዘመኛውን በመስመር ላይ ተጠቀም',
    useOnlineVersion: 'የመስመር ላይ ስሪቱን ተጠቀም',
    downloadForOffline: 'ያለ ኢንተርኔት አውርድ',
    notDownloaded: 'አልወረደም',
    ready: 'ዝግጁ',
    activeStatus: 'ንቁ',
    error: 'ስህተት',
    member: 'አባል',
    members: 'አባላት',
    signOut: 'ውጣ',
    adminPanel: 'የአስተዳዳሪ ገጽ',
    superAdmin: 'ከፍተኛ አስተዳዳሪ',
    manageLessons: 'ትምህርቶችን አስተዳድር',
    languageHelper: 'የመጀመሪያውን የትምህርት ይዘት ሳይቀይር የመምህሩን መልስ ይቀይራል።',
    teacher: 'መምህር',
    tutor: 'አስተማሪ',
    quizCoach: 'የፈተና አሰልጣኝ',
    online: 'በመስመር ላይ',
    currentLesson: 'የአሁኑ ትምህርት',
    teacherReady: 'የትምህርቱ አስተማሪ ዝግጁ ነው',
    aiLessonTutor: 'የኤአይ ትምህርት አስተማሪ',
    groundedIn: 'በዚህ ትምህርት ላይ የተመሠረተ',
    newTutorConversation: 'አዲስ የአስተማሪ ውይይት ጀምር',
    tutorMode: 'የአስተማሪ ሁኔታ',
    tutorLanguage: 'የአስተማሪ ቋንቋ',
    explainSimply: 'ይህን ትምህርት በቀላሉ አብራራ',
    keyIdeas: 'ዋና ሐሳቦቹ ምንድን ናቸው?',
    realExample: 'ተጨባጭ ምሳሌ ስጠኝ',
    startQuiz: 'ፈተና ጀምር',
    giveHint: 'ፍንጭ ስጠኝ',
    harderQuestion: 'የበለጠ ከባድ ጥያቄ ጠይቀኝ',
    tutorGuidance: 'ከዚህ ትምህርት ቀላል ማብራሪያ፣ ምሳሌ ወይም ዋና ሐሳቦችን ይጠይቁ።',
    quizGuidance: 'ፈተና እንዲጀምር ይጠይቁኝ። አንድ ጥያቄ በአንድ ጊዜ እሰጣለሁ እና መልስዎን እጠብቃለሁ።',
    voiceOutputUnavailable: 'የድምፅ ውጤት በዚህ መሣሪያ ላይ አይገኝም። የጽሑፍ መልሱ ግን ይገኛል።',
    textAnswerAvailable: 'ድምፅ ቢዘጋም መልሶች እንደ ጽሑፍ ይገኛሉ።',
    readTutorAloud: 'የአስተማሪውን መልስ በድምፅ አንብብ',
    tutorThinking: 'አስተማሪው እያሰበ ነው',
    muteTutorVoice: 'የአስተማሪውን ድምፅ ዝጋ',
    enableTutorVoice: 'የአስተማሪውን ድምፅ አብራ',
    sendTutorQuestion: 'የአስተማሪውን ጥያቄ ላክ',
    muteAIVoice: 'የኤአይ ድምፅ ዝጋ',
    enableAIVoice: 'የኤአይ ድምፅ አብራ',
    teacherMode: 'የመምህር ሁኔታ',
    voiceRecordingUnsupported: 'የድምፅ ቀረጻ በዚህ መሣሪያ ላይ አይደገፍም።',
    noAudioRecorded: 'ምንም ድምፅ አልተቀረጸም። እባክዎ እንደገና ይሞክሩ።',
    voiceTranscriptionFailed: 'የድምፅ ወደ ጽሑፍ ለውጥ አልተሳካም።',
    microphoneRecordingFailed: 'የማይክሮፎን ቀረጻ አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
    micPermissionRequired: 'ለድምፅ ግቤት የማይክሮፎን ፈቃድ ያስፈልጋል።',
    microphoneUnavailable: 'ማይክሮፎኑ አይገኝም። እባክዎ እንደገና ይሞክሩ።',
    listeningStatus: 'እያዳመጥኩ ነው… ለማቆም ማይክሮፎኑን ይንኩ።',
    transcribingStatus: 'ጥያቄዎን ወደ ጽሑፍ በመቀየር ላይ…',
    stopVoiceRecording: 'የድምፅ ቀረጻን አቁም',
    startVoiceRecording: 'የድምፅ ቀረጻን ጀምር',
    chatError: 'ይቅርታ፣ ስህተት አጋጥሞኛል። እባክዎ እንደገና ይሞክሩ።',
    tutorUnavailable: 'አስተማሪው አሁን መልስ መስጠት አልቻለም።',
    tryAgain: 'እባክዎ እንደገና ይሞክሩ።',
    welcome: 'ወደ ኢትዮ-ኮስሞስ እንኳን በደህና መጡ!',
    askAnything: 'ስለ ሥነ ፈለክ ወይም ስለ ማህበረሰባችን ማንኛውንም ጥያቄ ይጠይቁኝ።',
    askAboutLesson: 'ስለዚህ ትምህርት ይጠይቁኝ።',
    askYourTeacher: 'መምህሩን ይጠይቁ...',
    answerOrHint: 'መልስ ይስጡ ወይም ፍንጭ ይጠይቁ...',
    readAloud: 'በድምፅ አንብብ',
    voiceOn: 'ድምፅ ክፍት',
    voiceOff: 'ድምፅ ዝግ',
    solarSystem: 'የፀሐይ ሥርዓት',
    solarSystemShort: 'ፕላኔቶችን ያስሱ',
    solarSystemIntro: 'የፀሐይ ሥርዓታችንን በቀላል ተግባራዊ ሞዴል ያስሱ።',
    orbitColorEffects: 'የምህዋር ቀለም ተፅዕኖዎች',
    simulationControls: 'የማስመሰያ መቆጣጠሪያዎች',
    dragToRotate: 'ለማዞር ይጎትቱ',
    pinchToZoom: 'ለማጉላት ሁለት ጣቶችን ይጠቀሙ',
    tapPlanet: 'መረጃ ለማየት ፕላኔትን ይንኩ',
    resetView: 'እይታን መልስ',
    pauseSimulation: 'ማስመሰያውን አቁም',
    playSimulation: 'ማስመሰያውን አጫውት',
    selectedPlanet: 'የተመረጠ ፕላኔት',
    distanceFromSun: 'ከፀሐይ ያለ ርቀት',
    diameter: 'ዲያሜትር',
    orbitalPeriod: 'የምህዋር ዘመን',
    noPlanetSelected: 'ዝርዝር ለማየት ፕላኔትን ይንኩ።',
    planetSun: 'ፀሐይ',
    planetMercury: 'ሜርኩሪ',
    planetVenus: 'ቬኑስ',
    planetEarth: 'ምድር',
    planetMars: 'ማርስ',
    planetJupiter: 'ጁፒተር',
    planetSaturn: 'ሳተርን',
    planetUranus: 'ዩራነስ',
    planetNeptune: 'ኔፕቱን',
    planetPluto: 'ፕሉቶ',
    sourcePlanets: 'ፕላኔቶች',
    sourceBack: 'ወደ ኢትዮ-ኮስሞስ ተመለስ',
    sourceControlsHint: 'ለማዞር ይጎትቱ · ለማጉላት ሁለት ጣቶችን ወይም ማሸብለያ ይጠቀሙ · ለማተኮር ፕላኔትን ይንኩ',
    sourceScale: 'በእውነተኛ የሥነ ፈለክ መረጃ ላይ የተመሠረተ ልኬት',
    sourceMoons: 'ጨረቃዎች',
    sourceLoading: 'የፀሐይ ሥርዓቱ በመገንባት ላይ…',
    premiumRequiredTitle: 'የPremium መዳረሻ ያስፈልጋል',
    premiumRequiredBody: 'ይህ ባህሪ በPremium ይገኛል። የክፍያ ስርዓቱ ሲገናኝ ይመዝገቡ ወይም አስተዳዳሪ መዳረሻ እንዲሰጥዎ ይጠይቁ።',
    premiumManualMode: 'የደንበኝነት ክፍያ ስርዓት ገና አልተገናኘም። አስተዳዳሪ ከAdmin ዳሽቦርድ በእጅ Premium መስጠት ይችላል።',
    backToLearning: 'ወደ መማር ተመለስ',
    close: 'ዝጋ',
  },
};

export function getAppCopy(language: AppLanguage, key: AppCopyKey): string {
  return COPY[language][key];
}
