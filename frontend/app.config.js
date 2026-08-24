const IS_DEVELOPMENT = process.env.APP_VARIANT === "development";

export default ({ config }) => ({
  ...config,

  name: IS_DEVELOPMENT ? "음성 업무수첩 DEV" : "음성 업무수첩",

  scheme: IS_DEVELOPMENT ? "voicework-dev" : "voicework",

  android: {
    ...config.android,
    package: IS_DEVELOPMENT
      ? "com.personal.voiceworkmanager.dev"
      : "com.personal.voiceworkmanager",
  },

  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEVELOPMENT
      ? "com.personal.voiceworkmanager.dev"
      : "com.personal.voiceworkmanager",
  },
});
