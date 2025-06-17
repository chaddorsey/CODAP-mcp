import {
  formatTimeDisplay,
  getTimerStatus,
  shouldAnnounceTime,
  formatTimer,
  getAccessibleTimeMessage,
  TimerStatus
} from '../../utils/timeFormat';

describe('timeFormat utilities', () => {
  describe('formatTimeDisplay', () => {
    it('formats seconds correctly for minutes only', () => {
      expect(formatTimeDisplay(0)).toBe('00:00');
      expect(formatTimeDisplay(30)).toBe('00:30');
      expect(formatTimeDisplay(60)).toBe('01:00');
      expect(formatTimeDisplay(90)).toBe('01:30');
      expect(formatTimeDisplay(600)).toBe('10:00');
      expect(formatTimeDisplay(3599)).toBe('59:59');
    });

    it('formats seconds correctly for hours, minutes, and seconds', () => {
      expect(formatTimeDisplay(3600)).toBe('01:00:00');
      expect(formatTimeDisplay(3661)).toBe('01:01:01');
      expect(formatTimeDisplay(7200)).toBe('02:00:00');
      expect(formatTimeDisplay(7323)).toBe('02:02:03');
      expect(formatTimeDisplay(36000)).toBe('10:00:00');
    });

    it('handles edge cases correctly', () => {
      expect(formatTimeDisplay(-10)).toBe('00:00');
      expect(formatTimeDisplay(0)).toBe('00:00');
      expect(formatTimeDisplay(1)).toBe('00:01');
      expect(formatTimeDisplay(59)).toBe('00:59');
    });

    it('pads single digits with zeros', () => {
      expect(formatTimeDisplay(65)).toBe('01:05');
      expect(formatTimeDisplay(3665)).toBe('01:01:05');
    });
  });

  describe('getTimerStatus', () => {
    const totalSeconds = 600; // 10 minutes

    it('returns EXPIRED when time is zero or negative', () => {
      expect(getTimerStatus(0, totalSeconds)).toBe(TimerStatus.EXPIRED);
      expect(getTimerStatus(-1, totalSeconds)).toBe(TimerStatus.EXPIRED);
    });

    it('returns CRITICAL when 10% or less time remaining', () => {
      expect(getTimerStatus(60, totalSeconds)).toBe(TimerStatus.CRITICAL); // 10%
      expect(getTimerStatus(30, totalSeconds)).toBe(TimerStatus.CRITICAL); // 5%
      expect(getTimerStatus(1, totalSeconds)).toBe(TimerStatus.CRITICAL);
    });

    it('returns WARNING when 25% or less time remaining', () => {
      expect(getTimerStatus(150, totalSeconds)).toBe(TimerStatus.WARNING); // 25%
      expect(getTimerStatus(120, totalSeconds)).toBe(TimerStatus.WARNING); // 20%
      expect(getTimerStatus(61, totalSeconds)).toBe(TimerStatus.WARNING); // Just above critical
    });

    it('returns ACTIVE when more than 25% time remaining', () => {
      expect(getTimerStatus(300, totalSeconds)).toBe(TimerStatus.ACTIVE); // 50%
      expect(getTimerStatus(450, totalSeconds)).toBe(TimerStatus.ACTIVE); // 75%
      expect(getTimerStatus(151, totalSeconds)).toBe(TimerStatus.ACTIVE); // Just above warning
    });
  });

  describe('shouldAnnounceTime', () => {
    it('announces at critical milestones', () => {
      // 10 minutes
      expect(shouldAnnounceTime(600, 601)).toBe(true);
      expect(shouldAnnounceTime(600, 600)).toBe(false);
      expect(shouldAnnounceTime(599, 600)).toBe(false);

      // 5 minutes
      expect(shouldAnnounceTime(300, 301)).toBe(true);
      expect(shouldAnnounceTime(300, 350)).toBe(true);
      
      // 2 minutes
      expect(shouldAnnounceTime(120, 121)).toBe(true);
      
      // 1 minute
      expect(shouldAnnounceTime(60, 61)).toBe(true);
      
      // 30 seconds
      expect(shouldAnnounceTime(30, 31)).toBe(true);
      
      // 10 seconds
      expect(shouldAnnounceTime(10, 11)).toBe(true);
    });

    it('does not announce at non-critical times', () => {
      expect(shouldAnnounceTime(500, 501)).toBe(false);
      expect(shouldAnnounceTime(250, 251)).toBe(false);
      expect(shouldAnnounceTime(100, 101)).toBe(false);
      expect(shouldAnnounceTime(50, 51)).toBe(false);
      expect(shouldAnnounceTime(20, 21)).toBe(false);
      expect(shouldAnnounceTime(5, 6)).toBe(false);
    });

    it('handles edge cases', () => {
      expect(shouldAnnounceTime(0, 1)).toBe(false);
      expect(shouldAnnounceTime(600, 599)).toBe(false); // Time increased
    });
  });

  describe('formatTimer', () => {
    const totalSeconds = 600;

    it('returns complete formatted time object', () => {
      const result = formatTimer(300, totalSeconds);
      
      expect(result.display).toBe('05:00');
      expect(result.status).toBe(TimerStatus.ACTIVE);
      expect(result.seconds).toBe(300);
      expect(result.shouldAnnounce).toBe(false);
    });

    it('detects announcement opportunities', () => {
      const result = formatTimer(300, totalSeconds, 301);
      
      expect(result.shouldAnnounce).toBe(true);
    });

    it('handles status changes correctly', () => {
      const critical = formatTimer(60, totalSeconds);
      expect(critical.status).toBe(TimerStatus.CRITICAL);
      
      const warning = formatTimer(150, totalSeconds);
      expect(warning.status).toBe(TimerStatus.WARNING);
      
      const expired = formatTimer(0, totalSeconds);
      expect(expired.status).toBe(TimerStatus.EXPIRED);
    });
  });

  describe('getAccessibleTimeMessage', () => {
    it('provides appropriate messages for each status', () => {
      const expiredTime = formatTimer(0, 600);
      expect(getAccessibleTimeMessage(expiredTime)).toBe('Session has expired');

      const criticalTime = formatTimer(30, 600);
      expect(getAccessibleTimeMessage(criticalTime)).toBe('Warning: Only 00:30 remaining in session');

      const warningTime = formatTimer(120, 600);
      expect(getAccessibleTimeMessage(warningTime)).toBe('Session expires in 02:00');
    });

    it('provides different messages for active status based on time', () => {
      const longActiveTime = formatTimer(300, 600);
      expect(getAccessibleTimeMessage(longActiveTime)).toBe('5 minutes remaining in session');

      const shortActiveTime = formatTimer(45, 600); // This is CRITICAL status (45/600 = 7.5% < 10%)
      expect(getAccessibleTimeMessage(shortActiveTime)).toBe('Warning: Only 00:45 remaining in session');
    });

    it('handles edge cases in message generation', () => {
      const oneMinute = formatTimer(60, 600); // This is CRITICAL status (60/600 = 10%)
      expect(getAccessibleTimeMessage(oneMinute)).toBe('Warning: Only 01:00 remaining in session');

      const oneSecond = formatTimer(1, 600); // This is CRITICAL status (1/600 < 10%)
      expect(getAccessibleTimeMessage(oneSecond)).toBe('Warning: Only 00:01 remaining in session');
    });
  });

  describe('TimerStatus enum', () => {
    it('has correct string values', () => {
      expect(TimerStatus.ACTIVE).toBe('active');
      expect(TimerStatus.WARNING).toBe('warning');
      expect(TimerStatus.CRITICAL).toBe('critical');
      expect(TimerStatus.EXPIRED).toBe('expired');
    });
  });
}); 