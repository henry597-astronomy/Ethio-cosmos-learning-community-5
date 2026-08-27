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
  | 'joinStream'
  | 'hostLive'
  | 'liveNow'
  | 'upcomingClassrooms'
  | 'joinRoom'
  | 'joining'
  | 'refreshClassrooms'
  | 'noLiveRooms'
  | 'noUpcomingClassrooms'
  | 'streamRoomsLoadError'
  | 'startsAt'
  | 'hostedBy'
  | 'classrooms'
  | 'scheduleClassroom'
  | 'classroomTitle'
  | 'classroomSubject'
  | 'gradeLevel'
  | 'classroomDescription'
  | 'startTime'
  | 'endTime'
  | 'roomName'
  | 'publishClassroom'
  | 'schedule'
  | 'cancelClassroom'
  | 'cancelledStatus'
  | 'scheduledStatus'
  | 'endedStatus'
  | 'publishedStatus'
  | 'hiddenStatus'
  | 'classroomSaved'
  | 'classroomCancelled'
  | 'classroomError'
  | 'removeClassroom'
  | 'removeClassroomConfirm'
  | 'classroomRemoved'
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
  | 'copyAnswer'
  | 'answerCopied'
  | 'askFollowUp'
  | 'simplifyAnswer'
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
  | 'premiumSubscriptionTitle'
  | 'premiumSubscriptionBody'
  | 'subscribe'
  | 'manualPaymentTitle'
  | 'manualPaymentDescription'
  | 'manualPaymentMethodLabel'
  | 'manualPaymentReceiverLabel'
  | 'manualPaymentAccountLabel'
  | 'manualPaymentInstructionsLabel'
  | 'manualPaymentWarning'
  | 'manualPaymentEnable'
  | 'manualPaymentSave'
  | 'manualPaymentSaved'
  | 'manualPaymentSaving'
  | 'manualPaymentPending'
  | 'backToLearning'
  | 'close'
  | 'notifications'
  | 'notificationSettings'
  | 'notificationPermissionHelp'
  | 'classroomReminders'
  | 'adminAnnouncements'
  | 'channelPosts'
  | 'browserNotifications'
  | 'nativeNotifications'
  | 'reminderLeadTime'
  | 'minutes'
  | 'notificationPermissionGranted'
  | 'notificationPermissionStatus'
  | 'notificationPermissionDenied'
  | 'notificationSettingsError'
  | 'noNotifications'
  | 'markAllRead'
  | 'markRead'
  | 'unread'
  | 'notificationAdminAnnouncement'
  | 'notificationClassroomReminder'
  | 'notificationClassroomLive'
  | 'notificationChannelPost'
  | 'notificationSystem'
  | 'sendAnnouncement'
  | 'announcementTitle'
  | 'announcementMessage'
  | 'optionalActionPath'
  | 'announcementHelper'
  | 'publishAnnouncement'
  | 'announcementPublished'
  | 'announcementPublishError'
  | 'announcementValidation';

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
    joinStream: 'Join Stream',
    hostLive: 'Host Live',
    liveNow: 'Live Now',
    upcomingClassrooms: 'Upcoming Classrooms',
    joinRoom: 'Join Room',
    joining: 'Joining...',
    refreshClassrooms: 'Refresh classrooms',
    noLiveRooms: 'No classrooms are live right now.',
    noUpcomingClassrooms: 'No upcoming classrooms.',
    streamRoomsLoadError: 'Could not load classrooms. Please try again.',
    startsAt: 'Starts',
    hostedBy: 'Hosted by',
    classrooms: 'Classrooms',
    scheduleClassroom: 'Schedule Classroom',
    classroomTitle: 'Classroom title',
    classroomSubject: 'Subject',
    gradeLevel: 'Grade level',
    classroomDescription: 'Description',
    startTime: 'Start time',
    endTime: 'End time',
    roomName: 'Room name',
    publishClassroom: 'Publish for students',
    schedule: 'Schedule',
    cancelClassroom: 'Cancel classroom',
    cancelledStatus: 'Cancelled',
    scheduledStatus: 'Scheduled',
    endedStatus: 'Ended',
    publishedStatus: 'Published',
    hiddenStatus: 'Hidden',
    classroomSaved: 'Classroom saved.',
    classroomCancelled: 'Classroom cancelled.',
    classroomError: 'Could not save classroom. Please try again.',
    removeClassroom: 'Remove permanently',
    removeClassroomConfirm: 'Permanently remove this classroom and stop its active room if it is live? This cannot be undone.',
    classroomRemoved: 'Classroom permanently removed.',
    notifications: 'Notifications',
    notificationSettings: 'Notification settings',
    notificationPermissionHelp: 'Choose which notifications you want to receive. Permissions are requested only when you enable an external notification option.',
    classroomReminders: 'Classroom reminders',
    adminAnnouncements: 'Admin announcements',
    channelPosts: 'Channel posts',
    browserNotifications: 'Browser notifications',
    nativeNotifications: 'Android reminders',
    reminderLeadTime: 'Reminder lead time',
    minutes: 'minutes',
    notificationPermissionGranted: 'Notification permission is enabled for this device.',
    notificationPermissionStatus: 'In-app notifications remain available. External alerts are optional and device-controlled.',
    notificationPermissionDenied: 'Notification permission was not granted. You can change it in device or browser settings.',
    notificationSettingsError: 'Notification settings could not be saved. Please try again.',
    noNotifications: 'You have no notifications yet.',
    markAllRead: 'Mark all read',
    markRead: 'Mark read',
    unread: 'Unread',
    notificationAdminAnnouncement: 'Admin announcement',
    notificationClassroomReminder: 'Classroom reminder',
    notificationClassroomLive: 'Classroom live',
    notificationChannelPost: 'Channel post',
    notificationSystem: 'System',
    sendAnnouncement: 'Send announcement',
    announcementTitle: 'Announcement title',
    announcementMessage: 'Announcement message',
    optionalActionPath: 'Optional app path',
    announcementHelper: 'This sends the announcement to active, unblocked accounts that have not opted out of Admin announcements. User-entered announcement text is delivered as written.',
    publishAnnouncement: 'Publish announcement',
    announcementPublished: 'Announcement sent successfully.',
    announcementPublishError: 'Could not publish the announcement.',
    announcementValidation: 'Enter a title and message before publishing.',
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
    copyAnswer: 'Copy answer',
    answerCopied: 'Copied',
    askFollowUp: 'Ask follow-up',
    simplifyAnswer: 'Simplify',
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
    premiumRequiredBody: 'This feature requires Premium. Ask an administrator to grant access after your payment is verified.',
    premiumManualMode: 'Premium access is granted manually by an administrator after payment verification.',
    premiumSubscriptionTitle: 'Premium subscription',
    premiumSubscriptionBody: 'Review the payment details below, then send your transaction reference to an administrator after payment.',
    subscribe: 'Subscribe',
    manualPaymentTitle: 'Manual payment details',
    manualPaymentDescription: 'These public details are shown to users when manual Premium payment is available.',
    manualPaymentMethodLabel: 'Payment method',
    manualPaymentReceiverLabel: 'Receiver name',
    manualPaymentAccountLabel: 'Receiver account or phone',
    manualPaymentInstructionsLabel: 'Payment instructions',
    manualPaymentWarning: 'Enter only public payment details. Never enter a PIN, password, OTP, card number, or API key.',
    manualPaymentEnable: 'Show these instructions to users',
    manualPaymentSave: 'Save payment details',
    manualPaymentSaved: 'Payment details saved.',
    manualPaymentSaving: 'Saving…',
    manualPaymentPending: 'After you pay, send the transaction reference to an administrator. Premium is activated only after the payment is verified.',
    backToLearning: 'Back to learning',
    close: 'Close',
  },
  am: {
    home: 'መነሻ ገጽ',
    lesson: 'ትምህርት',
    materials: 'ት/ት መርጃ',
    channel: 'ቻናል',
    quizzes: 'ፈተናዎች',
    about: 'ስለ እኛ',
    aboutSubtitle: 'የኢትዮጵያን ቀጣይ ትውልድ የሥነ ፈለክ ተመራማሪዎችና የህዋ አድናቂዎች ለመሆን እናበረታታለን።',
    ourMission: 'ተልዕኳችን',
    whoWeAre: 'ማን ነን?',
    meetTeam: 'ቡድናችንን ያግኙ',
    platformCreators: 'የመድረኩ ፈጣሪዎች',
    educationalAdvisors: 'የትምህርት አማካሪዎች',
    communityMembers: 'የማህበረሰብ አባላት',
    noMembersAdded: 'በዚህ ክፍል እስካሁን ምንም አባል አልተጨመረም።',
    missionAlt: 'ተልዕኳችን',
    teamCollaborationAlt: 'የቡድን ትብብር',
    astronomicalObservationAlt: 'የሥነ ፈለክ ምልከታ',
    missionFallback: 'ተልዕኳችን የአጽናፈ ዓለምን ድንቅ በፈጠራ ዲጂታል ትምህርትና በማህበረሰብ ተሳትፎ ለሁሉም ተደራሽ በማድረግ የሥነ ፈለክ ትምህርትን በኢትዮጵያ ማስፋፋት ነው።',
    whoWeAreFallback1: 'ኢትዮ-ኮስሞስ ለከዋክብት ያላቸውን ፍቅር ለዓለም ማካፈል በሚፈልጉ ቀናተኛ የሥነ ፈለክ ተመራማሪዎች፣ አስተማሪዎችና አዘጋጆች የተፈጠረ በማህበረሰብ የሚመራ መድረክ ነው።',
    whoWeAreFallback2: 'ዘመናዊ የትምህርት ዘዴዎችን ከኢትዮጵያ የበለጸገ የሥነ ፈለክ ቅርስ ጋር በማጣመር ሳይንስንና ባህልን የሚያከብር ልዩ የመማሪያ ልምድ እንፈጥራለን።',
    yourProgress: 'የእርስዎ የመማር እድገት',
    trackJourney: 'በኮስሞስ ውስጥ ያለዎትን የመማር ጉዞ ይከታተሉ',
    lessonsCompleted: 'የተጠናቀቁ ትምህርቶች',
    overallProgress: 'አጠቃላይ የመማር እድገት',
    achievements: 'ያገኙዋቸው ስኬቶች',
    progressByTopic: 'በየርዕሱ ያለ እድገት',
    noTopicsYet: 'እስካሁን ርዕስ የለም።',
    firstSteps: 'የመጀመሪያ እርምጃዎች',
    risingStar: 'ተስፈኛ ኮከብ',
    spaceExplorer: 'የህዋ ተመራማሪ',
    cosmicScholar: 'የኮስሞስ ምሁር',
    astronomyMaster: 'የሥነ ፈለክ ባለሙያ',
    universalExpert: 'የአጽናፈ ዓለም ባለሙያ',
    yourBookmarks: 'የእርስዎ ዕልባቶች',
    noBookmarksYet: 'እስካሁን ምንም ዕልባት የለም።',
    startBookmarking: 'ትምህርቶችን ያንብቡ፣ የሚወዷቸውንም ትምህርቶች ዕልባት ያድርጉ!',
    exploreTopics: 'የትምህርት ርዕሶችን ያስሱ',
    goToLesson: 'ወደ ትምህርቱ ይሂዱ',
    removeBookmark: 'ከዕልባቶች ያስወግዱ',
    loadingBookmarks: 'ዕልባቶች በመጫን ላይ...',
    loadingProgress: 'የእርስዎ እድገት በመጫን ላይ ነው...',
    progressLoadError: 'እድገትን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    signIn: 'ይግቡ',
    joinStream: 'ወደ ቀጥታ ስርጭት ይቀላቀሉ',
    hostLive: 'ቀጥታ ክፍል ያስተናግዱ',
    liveNow: 'አሁን በቀጥታ',
    upcomingClassrooms: 'መጪ የትምህርት ክፍሎች',
    joinRoom: 'ክፍሉን ይቀላቀሉ',
    joining: 'በመቀላቀል ላይ...',
    refreshClassrooms: 'የክፍሎችን ዝርዝር አድስ',
    noLiveRooms: 'በአሁኑ ጊዜ በቀጥታ የሚሰጥ ክፍል የለም።',
    noUpcomingClassrooms: 'በቅርቡ የሚጀምር ክፍል የለም።',
    streamRoomsLoadError: 'የክፍሎችን ዝርዝር መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    startsAt: 'የሚጀምርበት ጊዜ',
    hostedBy: 'አቅራቢው',
    classrooms: 'ክፍሎች',
    scheduleClassroom: 'ክፍል ያቅዱ',
    classroomTitle: 'የክፍሉ ርዕስ',
    classroomSubject: 'የትምህርት ዘርፍ',
    gradeLevel: 'የትምህርት ደረጃ',
    classroomDescription: 'የክፍሉ መግለጫ',
    startTime: 'የመጀመሪያ ጊዜ',
    endTime: 'የመጨረሻ ጊዜ',
    roomName: 'የክፍሉ ስም',
    publishClassroom: 'ለተማሪዎች ያትሙ',
    schedule: 'ያቅዱ',
    cancelClassroom: 'ክፍሉን ይሰርዙ',
    cancelledStatus: 'ተሰርዟል',
    scheduledStatus: 'ታቅዷል',
    endedStatus: 'ተጠናቋል',
    publishedStatus: 'ታትሟል',
    hiddenStatus: 'ተደብቋል',
    classroomSaved: 'ክፍሉ ተቀምጧል።',
    classroomCancelled: 'ክፍሉ ተሰርዟል።',
    classroomError: 'ክፍሉን ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    removeClassroom: 'በቋሚነት ያስወግዱ',
    removeClassroomConfirm: 'ይህንን ክፍል በቋሚነት ማስወገድ ይፈልጋሉ? ክፍሉ በቀጥታ ላይ ከሆነ የቀጥታ ክፍሉም ይቆማል። ይህ እርምጃ መልሶ ሊቀለበስ አይችልም።',
    classroomRemoved: 'ክፍሉ በቋሚነት ተወግዷል።',
    notifications: 'ማሳወቂያዎች',
    notificationSettings: 'የማሳወቂያ ቅንብሮች',
    notificationPermissionHelp: 'ሊደርሱዎት የሚፈልጉትን ማሳወቂያዎች ይምረጡ። የውጭ ማሳወቂያ አማራጭን ሲያነቃቁ ብቻ የመሣሪያ ፈቃድ ይጠየቃል።',
    classroomReminders: 'የክፍል ማሳሰቢያዎች',
    adminAnnouncements: 'የአስተዳዳሪ ማሳወቂያዎች',
    channelPosts: 'የቻናል ልጥፎች',
    browserNotifications: 'የአሳሽ ማሳወቂያዎች',
    nativeNotifications: 'የአንድሮይድ አስታዋሾች',
    reminderLeadTime: 'የአስታዋሽ ቅድመ ጊዜ',
    minutes: 'ደቂቃዎች',
    notificationPermissionGranted: 'በዚህ መሣሪያ ላይ የማሳወቂያ ፈቃድ ተሰጥቷል።',
    notificationPermissionStatus: 'በመተግበሪያ ውስጥ ያሉ ማሳወቂያዎች ሁልጊዜ ይገኛሉ። የውጭ ማሳወቂያዎች አማራጭ ናቸው እና በመሣሪያዎ ቅንብሮች ይቆጣጠራሉ።',
    notificationPermissionDenied: 'የማሳወቂያ ፈቃድ አልተሰጠም። በመሣሪያዎ ወይም በአሳሽዎ ቅንብሮች ላይ መልሰው ማንቃት ይችላሉ።',
    notificationSettingsError: 'የማሳወቂያ ቅንብሮችን ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    noNotifications: 'እስካሁን ማሳወቂያ አልደረሰዎትም።',
    markAllRead: 'ሁሉንም እንደተነበቡ ምልክት ያድርጉ',
    markRead: 'እንደተነበበ ምልክት ያድርጉ',
    unread: 'ያልተነበበ',
    notificationAdminAnnouncement: 'የአስተዳዳሪ ማሳወቂያ',
    notificationClassroomReminder: 'የክፍል ማሳሰቢያ',
    notificationClassroomLive: 'በቀጥታ የሚሰጥ ክፍል',
    notificationChannelPost: 'የቻናል ልጥፍ',
    notificationSystem: 'ስርዓት',
    sendAnnouncement: 'ማሳወቂያ ይላኩ',
    announcementTitle: 'የማሳወቂያ ርዕስ',
    announcementMessage: 'የማሳወቂያ መልዕክት',
    optionalActionPath: 'አማራጭ የመተግበሪያ መንገድ',
    announcementHelper: 'ይህ ማሳወቂያ የአስተዳደር ማሳወቂያዎችን ያላጠፉ ንቁና ያልታገዱ መለያዎች ይደርሳቸዋል። በአስተዳዳሪ የሚጻፈው ጽሑፍ እንደተጻፈ ይላካል።',
    publishAnnouncement: 'ማሳወቂያውን ያትሙ',
    announcementPublished: 'ማስታወቂያው በተሳካ ሁኔታ ተልኳል።',
    announcementPublishError: 'ማስታወቂያውን ማተም አልተቻለም።',
    announcementValidation: 'ከማተምዎ በፊት ርዕስና መልዕክት ያስገቡ።',
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
    searchTopics: 'ርዕስ ወይም ትምህርት ይፈልጉ...',
    clearSearch: 'የፍለጋ ቃሉን ያጽዱ',
    loadingTopics: 'የትምህርት ርዕሶች በመጫን ላይ...',
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
    noResults: 'ለፍለጋዎ ምንም ውጤት አልተገኘም።',
    loading: 'በመጫን ላይ...',
    loadingLesson: 'ትምህርቱ በመጫን ላይ ነው...',
    lessonNotFound: 'ይህ ትምህርት አልተገኘም',
    errorLoadingLesson: 'ትምህርቱን በመጫን ላይ ስህተት ተፈጥሯል፦',
    lessonIllustration: 'የትምህርቱ ምስል',
    lessonImageUnavailable: 'የትምህርቱ ምስል አይገኝም',
    pleaseLogInBookmark: 'ትምህርቶችን ለማስቀመጥ እባክዎ ይግቡ።',
    failedUpdateBookmark: 'ዕልባቱን ማዘመን አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    failedMarkComplete: 'ትምህርቱን እንደተጠናቀቀ ምልክት ማድረግ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    backToTopic: 'ወደ ርዕሱ ተመለስ',
    previousLesson: 'ያለፈው ትምህርት',
    nextLesson: 'ቀጣዩ ትምህርት',
    completeTopic: 'ርዕሱን ያጠናቅቁ',
    bookmark: 'ወደ ዕልባቶች ያስቀምጡ',
    bookmarked: 'በዕልባቶች ተቀምጧል',
    markComplete: 'እንደተጠናቀቀ ምልክት ያድርጉ',
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
    exploreCollection: 'የፎቶዎች፣ ቪዲዮዎችና ለማውረድ የሚችሉ መርጃዎችን ስብስብ ያስሱ',
    all: 'ሁሉም',
    browseByCategory: 'በምድብ ያስሱ',
    categories: 'ምድቦች',
    photos: 'ፎቶዎች',
    item: 'ንጥል',
    items: 'ንጥሎች',
    searchMaterialCategories: 'የቪዲዮ ቡድኖችን ወይም የመርጃ ምድቦችን ይፈልጉ...',
    noCategories: 'ለዚህ ማጣሪያ ምንም ምድብ ወይም መርጃ አልተገኘም።',
    backToCategories: 'ወደ ምድቦች ተመለስ',
    visitSource: 'ምንጩን ይጎብኙ',
    galleryImage: 'የማዕከሉ ምስል',
    directVideoFormat: 'ይህ የቪዲዮ ቅርጸት በቀጥታ ሊጫወት አይችልም።',
    openNewTab: 'በአዲስ ትር ይክፈቱ',
    photoGallery: 'የፎቶ ማዕከል',
    videos: 'ቪዲዮዎች',
    downloads: 'ውርዶች',
    open: 'ይክፈቱ',
    download: 'ያውርዱ',
    noMaterials: 'እስካሁን ምንም የትምህርት መርጃ የለም።',
    language: 'ቋንቋ',
    navigation: 'የገጽ አሰሳ',
    myProgress: 'የእኔ የመማር እድገት',
    bookmarks: 'ዕልባቶች',
    themes: 'የገጽታ ምርጫዎች',
    active: 'ንቁ',
    baseThemes: 'መሠረታዊ ገጽታዎች',
    darkTheme: 'ጨለማ ገጽታ',
    lightTheme: 'ብሩህ ገጽታ',
    linearGradients: 'ቀጥተኛ የቀለም ድብልቆች',
    offlineStorage: 'ከመስመር ውጭ ማከማቻ',
    preparingOffline: 'ከመስመር ውጭ የሚሰራ ይዘት በማዘጋጀት ላይ...',
    offlineDownloadFailed: 'ከመስመር ውጭ ለመጠቀም ማውረድ አልተሳካም።',
    closeUpdateOptions: 'የማዘመኛና ከመስመር ውጭ አማራጮችን ዝጋ',
    updateReady: 'አዲሱ የኢትዮኮስሞስ ማዘመኛ ዝግጁ ነው',
    chooseUseEthio: 'ኢትዮኮስሞስን እንዴት መጠቀም እንደሚፈልጉ ይምረጡ',
    updateOfflineDescription: 'ማዘመኛውን በመስመር ላይ ይጠቀሙ፤ ወይም ያሉትን ይዘቶች አውርደው ከመስመር ውጭ ይጠቀሙ።',
    onlineDescription: 'የአሁኑን ስሪት አሁኑኑ በመስመር ላይ ይጠቀሙ፤ የሚፈልጓቸውን ይዘቶችም ከመስመር ውጭ ለመጠቀም ያውርዱ።',
    preparing: 'በማዘጋጀት ላይ...',
    offlineReady: 'ያለ ኢንተርኔት ይዘት በዚህ መሣሪያ ላይ ዝግጁ ነው።',
    offlineItemSaved: 'ያለ ኢንተርኔት ለመጠቀም ተቀምጧል።',
    useUpdateOnline: 'ማዘመኛውን በመስመር ላይ ይጠቀሙ',
    useOnlineVersion: 'የመስመር ላይ ስሪቱን ይጠቀሙ',
    downloadForOffline: 'ከመስመር ውጭ ለመጠቀም ያውርዱ',
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
    tutor: 'የግል አስተማሪ',
    quizCoach: 'የፈተና አሰልጣኝ',
    online: 'በመስመር ላይ',
    currentLesson: 'እየተማሩት ያለው ትምህርት',
    teacherReady: 'የትምህርት አስተማሪዎ ዝግጁ ነው',
    aiLessonTutor: 'የኤአይ ትምህርት አስተማሪ',
    groundedIn: 'መሠረቱ ይህ ትምህርት ነው',
    newTutorConversation: 'አዲስ የአስተማሪ ውይይት ጀምር',
    tutorMode: 'የአስተማሪ ሁኔታ',
    tutorLanguage: 'የአስተማሪው ቋንቋ',
    explainSimply: 'ይህንን ትምህርት በቀላል መንገድ አብራራልኝ',
    keyIdeas: 'ዋናዎቹ ሐሳቦች ምንድን ናቸው?',
    realExample: 'ከእውነተኛ ሕይወት ምሳሌ ስጠኝ',
    startQuiz: 'ፈተና አስጀምር',
    giveHint: 'ፍንጭ ስጠኝ',
    harderQuestion: 'የበለጠ አስቸጋሪ ጥያቄ ጠይቀኝ',
    tutorGuidance: 'ከዚህ ትምህርት ቀላል ማብራሪያ፣ ምሳሌ ወይም ዋና ሐሳቦችን መጠየቅ ይችላሉ።',
    quizGuidance: 'ፈተና እንዲጀምር ይጠይቁኝ። በአንድ ጊዜ አንድ ጥያቄ እሰጣለሁ፣ ከዚያም መልስዎን እጠብቃለሁ።',
    voiceOutputUnavailable: 'በዚህ መሣሪያ ላይ የድምፅ ማሰማት አይገኝም። መልሱን እንደ ጽሑፍ ማንበብ ይችላሉ።',
    textAnswerAvailable: 'ድምፅን ቢያጠፉም መልሱ እንደ ጽሑፍ ይታያል።',
    readTutorAloud: 'የአስተማሪውን መልስ በድምፅ ያንብቡ',
    copyAnswer: 'መልሱን ቅዳ',
    answerCopied: 'ተቅዷል',
    askFollowUp: 'ተጨማሪ ጥያቄ ጠይቅ',
    simplifyAnswer: 'በቀላሉ አብራራ',
    tutorThinking: 'አስተማሪው መልስ እያዘጋጀ ነው',
    muteTutorVoice: 'የአስተማሪውን ድምፅ ያጥፉ',
    enableTutorVoice: 'የአስተማሪውን ድምፅ ያብሩ',
    sendTutorQuestion: 'ጥያቄዎን ለአስተማሪው ይላኩ',
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
    transcribingStatus: 'ጥያቄዎን ወደ ጽሑፍ እየቀየርኩ ነው…',
    stopVoiceRecording: 'የድምፅ ቀረጻውን ያቁሙ',
    startVoiceRecording: 'የድምፅ ቀረጻ ይጀምሩ',
    chatError: 'ይቅርታ፣ ስህተት ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።',
    tutorUnavailable: 'አስተማሪው በአሁኑ ጊዜ መልስ መስጠት አልቻለም።',
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
    solarSystemShort: 'ፕላኔቶችን ይመልከቱ',
    solarSystemIntro: 'የፀሐይ ሥርዓታችንን በይነተገናኝ ሞዴል በመጠቀም በቀላሉ ያስሱ።',
    orbitColorEffects: 'የምህዋር ቀለም ተፅዕኖዎች',
    simulationControls: 'የማስመሰያ መቆጣጠሪያዎች',
    dragToRotate: 'ለማዞር ጣትዎን ጎትተው ያንቀሳቅሱ',
    pinchToZoom: 'ለማጉላት በሁለት ጣቶች ይንኩና ይለጥጡ',
    tapPlanet: 'ዝርዝር መረጃ ለማየት ፕላኔትን ይንኩ',
    resetView: 'እይታውን ወደ መጀመሪያው መልስ',
    pauseSimulation: 'ማስመሰያውን ለጊዜው አቁም',
    playSimulation: 'ማስመሰያውን አስጀምር',
    selectedPlanet: 'የተመረጠ ፕላኔት',
    distanceFromSun: 'ከፀሐይ ያለ ርቀት',
    diameter: 'ዲያሜትር',
    orbitalPeriod: 'የምህዋር ዘመን',
    noPlanetSelected: 'ዝርዝር መረጃ ለማየት አንድ ፕላኔት ይንኩ።',
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
    premiumRequiredBody: 'ይህን ባህሪ ለመጠቀም Premium መዳረሻ ያስፈልጋል። ክፍያዎ ከተረጋገጠ በኋላ አስተዳዳሪውን መዳረሻ እንዲሰጥዎ ይጠይቁ።',
    premiumManualMode: 'የPremium መዳረሻ በአስተዳዳሪ በእጅ ይሰጣል፤ ክፍያዎ ከተረጋገጠ በኋላ መዳረሻ ሊሰጥዎ ይችላል።',
    premiumSubscriptionTitle: 'የPremium ምዝገባ',
    premiumSubscriptionBody: 'ከመክፈልዎ በፊት ከታች ያለውን የክፍያ መረጃ ይመልከቱ፤ ከከፈሉ በኋላ የግብይቱን ማጣቀሻ ለአስተዳዳሪ ይላኩ።',
    subscribe: 'ይመዝገቡ',
    manualPaymentTitle: 'በእጅ የክፍያ መረጃ',
    manualPaymentDescription: 'በእጅ የPremium ክፍያ ሲኖር እነዚህ ለሕዝብ የሚታዩ መረጃዎች ለተጠቃሚዎች ይታያሉ።',
    manualPaymentMethodLabel: 'የክፍያ ዘዴ',
    manualPaymentReceiverLabel: 'የተቀባዩ ስም',
    manualPaymentAccountLabel: 'የተቀባዩ ሂሳብ ወይም ስልክ',
    manualPaymentInstructionsLabel: 'የክፍያ መመሪያ',
    manualPaymentWarning: 'ለሕዝብ የሚታዩ የክፍያ መረጃዎችን ብቻ ያስገቡ። PIN፣ የይለፍ ቃል፣ OTP፣ የካርድ ቁጥር ወይም API ቁልፍ በፍጹም አያስገቡ።',
    manualPaymentEnable: 'ይህን መረጃ ለተጠቃሚዎች አሳይ',
    manualPaymentSave: 'የክፍያ መረጃን አስቀምጥ',
    manualPaymentSaved: 'የክፍያ መረጃው ተቀምጧል።',
    manualPaymentSaving: 'በማስቀመጥ ላይ…',
    manualPaymentPending: 'ከከፈሉ በኋላ የግብይቱን ማጣቀሻ ለአስተዳዳሪ ያስገቡ። Premium የሚነቃው ክፍያው ከተረጋገጠ በኋላ ብቻ ነው።',
    backToLearning: 'ወደ ትምህርቶች ተመለስ',
    close: 'ዝጋ',
  },
};

export function getAppCopy(language: AppLanguage, key: AppCopyKey): string {
  return COPY[language][key];
}
