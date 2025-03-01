export const getVideoDurationFromLog = (outputLog: string): number => {
  const durationMatch = outputLog.match(
    /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/,
  );
  if (durationMatch) {
    const hours = parseInt(durationMatch[1], 10);
    const minutes = parseInt(durationMatch[2], 10);
    const seconds = parseInt(durationMatch[3], 10);
    const milliseconds = parseInt(durationMatch[4], 10);

    // Convert the time to total seconds (milliseconds can be converted if necessary)
    const totalSeconds =
      hours * 3600 + minutes * 60 + seconds + milliseconds / 100;
    return totalSeconds;
  } else {
    return 0;
  }
};
