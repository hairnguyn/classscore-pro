const BASE_SCORE = 100;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const PRESET_BEHAVIOR_RULES = [
  { category: 'Học tập', reason: 'Nghỉ học không phép', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Học tập', reason: 'Vi phạm trong giờ học', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Học tập', reason: 'Không chuẩn bị bài, dụng cụ học tập', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Học tập', reason: 'Lỗi vi phạm ghi trong sổ đầu bài', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Học tập', reason: 'Giờ học xếp loại khá', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Học tập', reason: 'Giờ học xếp loại trung bình', defaultPoints: -10, scope: 'student', source: 'preset' },
  { category: 'Học tập', reason: 'Tuần học tốt', defaultPoints: 10, scope: 'student', source: 'preset' },
  { category: 'Nề nếp - Kỷ luật', reason: 'Đi học muộn hoặc vi phạm nội quy', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Nề nếp - Kỷ luật', reason: 'Không đeo thẻ học sinh', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Nề nếp - Kỷ luật', reason: 'Đi xe trên sân trường hoặc đá bóng sai nơi quy định', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Nề nếp - Kỷ luật', reason: 'Tuần không có lỗi vi phạm', defaultPoints: 10, scope: 'student', source: 'preset' },
  { category: 'Sinh hoạt dưới cờ', reason: 'Vắng sinh hoạt dưới cờ không có lý do', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Sinh hoạt dưới cờ', reason: 'Mất trật tự lần 2', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Sinh hoạt dưới cờ', reason: 'Mất trật tự lần 3', defaultPoints: -10, scope: 'student', source: 'preset' },
  { category: 'Văn hóa - Văn nghệ - Thể thao', reason: 'Không tham gia khi được phân công', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Văn hóa - Văn nghệ - Thể thao', reason: 'Tham gia tiết mục, thuyết trình, MC', defaultPoints: 10, scope: 'student', source: 'preset' },
  { category: 'Văn hóa - Văn nghệ - Thể thao', reason: 'Đạt giải phong trào', defaultPoints: 20, scope: 'student', source: 'preset' },
  { category: 'Lao động - Vệ sinh', reason: 'Không trực nhật', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Lao động - Vệ sinh', reason: 'Lớp bẩn, bàn ghế chưa gọn gàng', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Lao động - Vệ sinh', reason: 'Vứt rác sai nơi quy định', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Lao động - Vệ sinh', reason: 'Mang đồ ăn, thức uống vào lớp', defaultPoints: -2, scope: 'student', source: 'preset' },
  { category: 'Lao động - Vệ sinh', reason: 'Lao động tập trung không hoàn thành', defaultPoints: -10, scope: 'student', source: 'preset' },
  { category: 'Lao động - Vệ sinh', reason: 'Tuần sạch đẹp được xếp loại tốt', defaultPoints: 5, scope: 'student', source: 'preset' },
  { category: 'Bảo vệ cơ sở vật chất', reason: 'Ngồi, đứng, đi trên bàn', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Bảo vệ cơ sở vật chất', reason: 'Không tắt điện, quạt đúng quy định', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Bảo vệ cơ sở vật chất', reason: 'Viết vẽ bẩn, làm hỏng tài sản', defaultPoints: -5, scope: 'student', source: 'preset' },
  { category: 'Bảo vệ cơ sở vật chất', reason: 'Tuần giữ gìn cơ sở vật chất tốt', defaultPoints: 5, scope: 'student', source: 'preset' },
  { category: 'Công tác khác', reason: 'Sáng kiến nổi bật, hành động đẹp', defaultPoints: 10, scope: 'student', source: 'preset' },
  { category: 'Công tác khác', reason: 'Giải nhất phong trào cấp trên', defaultPoints: 20, scope: 'student', source: 'preset' },
  { category: 'Công tác khác', reason: 'Giải nhì phong trào cấp trên', defaultPoints: 15, scope: 'student', source: 'preset' },
  { category: 'Công tác khác', reason: 'Giải khuyến khích hoặc xếp hạng tiếp theo', defaultPoints: 10, scope: 'student', source: 'preset' },
];

export const DEFAULT_WEEK_CONFIG = {
  startDate: '',
  endDate: '',
  totalWeeks: 35,
};

export const DEFAULT_SCORING_CONFIG = {
  addedPoints: 10,
  subtractedPoints: 10,
};

export const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const toNumber = (value, fallback = 0) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

export const normalizeDateInput = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

export const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN').format(date);
};

export const getBehaviorGrade = (score) => {
  if (score >= 180) return 'Xuất sắc';
  if (score >= 150) return 'Tốt';
  if (score >= 130) return 'Khá';
  if (score >= 100) return 'Trung bình';
  return 'Yếu';
};

export const getAcademicGrade = (score) => {
  if (score >= 9) return 'Xuất sắc';
  if (score >= 8) return 'Tốt';
  if (score >= 6.5) return 'Khá';
  if (score >= 5) return 'Trung bình';
  return 'Yếu';
};

const gradeRank = {
  'Xuất sắc': 5,
  Tốt: 4,
  Khá: 3,
  'Trung bình': 2,
  Yếu: 1,
};

const rankGrade = {
  5: 'Xuất sắc',
  4: 'Tốt',
  3: 'Khá',
  2: 'Trung bình',
  1: 'Yếu',
};

export const getOverallGrade = (behaviorGrade, academicGrade) => {
  const behaviorRank = gradeRank[behaviorGrade] || 1;
  const academicRank = gradeRank[academicGrade] || 1;
  return rankGrade[Math.round((behaviorRank + academicRank) / 2)] || 'Yếu';
};

export const ensureRule = (rule, index = 0) => ({
  id: rule?.id || `rule-${index}-${createId()}`,
  category: rule?.category || 'Quy tắc tùy chỉnh',
  reason: rule?.reason || rule?.name || 'Quy tắc mới',
  defaultPoints: toNumber(rule?.defaultPoints ?? rule?.points ?? 0),
  scope: rule?.scope || 'student',
  source: rule?.source || 'custom',
});

export const ensureLog = (log, index = 0) => ({
  id: log?.id || `log-${index}-${createId()}`,
  category: log?.category || 'Nề nếp - Kỷ luật',
  reason: log?.reason || log?.label || 'Ghi nhận',
  points: toNumber(log?.points, 0),
  timestamp: toNumber(log?.timestamp, Date.now()),
  period: log?.period || 'week',
  note: log?.note || '',
  source: log?.source || 'manual',
});

export const ensureStudent = (student, index = 0) => ({
  id: student?.id || `student-${index}-${createId()}`,
  name: student?.name || 'Học sinh chưa đặt tên',
  dob: normalizeDateInput(student?.dob),
  pob: student?.pob || '',
  score: toNumber(student?.score ?? student?.academicScore ?? 0),
  disciplineScore: toNumber(student?.disciplineScore ?? BASE_SCORE, BASE_SCORE),
  studyRank: student?.studyRank || '',
  disciplineRank: student?.disciplineRank || '',
  notes: student?.notes || '',
  logs: Array.isArray(student?.logs) ? student.logs.map(ensureLog) : [],
});

export const ensureClass = (item, index = 0) => ({
  id: item?.id || `class-${index}-${createId()}`,
  name: item?.name || 'Lớp mới',
  teacher: item?.teacher || '',
  notes: item?.notes || '',
  students: Array.isArray(item?.students) ? item.students.map(ensureStudent) : [],
});

export const ensureAchievement = (achievement, index = 0) => ({
  id: achievement?.id || `achievement-${index}-${createId()}`,
  name: achievement?.name || 'Thành tích mới',
  achievementDate: normalizeDateInput(achievement?.achievementDate || achievement?.date),
  certifiedDate: normalizeDateInput(achievement?.certifiedDate || achievement?.date),
});

export const ensureWeekConfig = (config) => {
  const startDate = normalizeDateInput(config?.startDate) || normalizeDateInput(new Date());
  const endDate = normalizeDateInput(config?.endDate) || normalizeDateInput(new Date(Date.now() + 34 * 7 * DAY_IN_MS));
  const rawWeeks = toNumber(config?.totalWeeks, 0);
  const spanWeeks = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate) + DAY_IN_MS) / (7 * DAY_IN_MS)));

  return {
    startDate,
    endDate,
    totalWeeks: rawWeeks > 0 ? rawWeeks : spanWeeks,
  };
};

export const ensureScoringConfig = (config) => ({
  addedPoints: toNumber(config?.addedPoints, DEFAULT_SCORING_CONFIG.addedPoints),
  subtractedPoints: toNumber(config?.subtractedPoints, DEFAULT_SCORING_CONFIG.subtractedPoints),
});

export const calculateStudentStatus = (student) => {
  const logs = Array.isArray(student?.logs) ? student.logs.map(ensureLog) : [];
  const totalPointsScore = logs.reduce((total, log) => total + toNumber(log.points, 0), BASE_SCORE);
  const academicScore = toNumber(student?.score, 0);
  const behaviorGrade = student?.disciplineRank ? student.disciplineRank : getBehaviorGrade(totalPointsScore);
  const academicGrade = student?.studyRank ? student.studyRank : getAcademicGrade(academicScore);

  return {
    ...ensureStudent(student),
    logs,
    academicScore,
    calculatedScore: totalPointsScore,
    behaviorScore: totalPointsScore,
    behaviorGrade,
    academicGrade,
    overallGrade: getOverallGrade(behaviorGrade, academicGrade),
  };
};

export const getWeekRanges = (weekConfig) => {
  const config = ensureWeekConfig(weekConfig);
  const startMs = new Date(config.startDate).getTime();

  return Array.from({ length: Math.max(1, config.totalWeeks) }, (_, index) => {
    const start = new Date(startMs + index * 7 * DAY_IN_MS);
    const end = new Date(start.getTime() + 6 * DAY_IN_MS);

    return {
      index: index + 1,
      key: `week-${index + 1}`,
      label: `Tuần ${index + 1}`,
      start,
      end,
      fromTo: `${formatDate(start)} - ${formatDate(end)}`,
    };
  });
};

export const isTimestampInRange = (timestamp, start, end) => {
  const value = toNumber(timestamp, 0);
  return value >= start.getTime() && value <= end.getTime() + DAY_IN_MS - 1;
};

export const getLogsForWeek = (student, week) => {
  const logs = Array.isArray(student?.logs) ? student.logs : [];
  return logs.filter((log) => isTimestampInRange(log.timestamp, week.start, week.end));
};

export const getStudentWeekScore = (student, week) =>
  getLogsForWeek(student, week).reduce((total, log) => total + toNumber(log.points, 0), BASE_SCORE);

export const getStudentWeeklyBreakdown = (student, weekConfig) =>
  getWeekRanges(weekConfig).map((week) => ({
    ...week,
    score: getStudentWeekScore(student, week),
    logs: getLogsForWeek(student, week),
  }));

export const getStudentAverageWeekScore = (student, weekConfig) => {
  const weekly = getStudentWeeklyBreakdown(student, weekConfig);
  if (!weekly.length) {
    return BASE_SCORE;
  }

  return Math.round((weekly.reduce((total, item) => total + item.score, 0) / weekly.length) * 100) / 100;
};

export const getCurrentWeek = (weekConfig, now = Date.now()) =>
  getWeekRanges(weekConfig).find((week) => isTimestampInRange(now, week.start, week.end)) || getWeekRanges(weekConfig)[0];

export const getDatasetAnalytics = (dataset) => {
  const classes = Array.isArray(dataset?.classes) ? dataset.classes.map(ensureClass) : [];
  const processedClasses = classes.map((item) => ({
    ...item,
    students: item.students.map(calculateStudentStatus),
  }));
  const allStudents = processedClasses.flatMap((item) => item.students);
  const currentWeek = getCurrentWeek(dataset?.weekConfig || DEFAULT_WEEK_CONFIG);
  const weeklyAverages = getWeekRanges(dataset?.weekConfig || DEFAULT_WEEK_CONFIG).map((week) => {
    if (!allStudents.length) {
      return 0;
    }

    const avg = allStudents.reduce((total, student) => total + getStudentWeekScore(student, week), 0) / allStudents.length;
    return Math.round(avg * 100) / 100;
  });

  const gradeBuckets = {
    'Xuất sắc': 0,
    Tốt: 0,
    Khá: 0,
    'Trung bình': 0,
    Yếu: 0,
  };

  allStudents.forEach((student) => {
    gradeBuckets[student.overallGrade] += 1;
  });

  const sortedByPerformance = [...allStudents].sort((left, right) => right.calculatedScore - left.calculatedScore);
  const topPerformerThisWeek = [...allStudents]
    .map((student) => ({ student, score: getStudentWeekScore(student, currentWeek) }))
    .sort((left, right) => right.score - left.score)[0];

  const atRiskMap = new Map();
  allStudents.forEach((student) => {
    getLogsForWeek(student, currentWeek)
      .filter((log) => toNumber(log.points, 0) < 0)
      .forEach((log) => {
        const current = atRiskMap.get(log.reason) || { reason: log.reason, count: 0, students: new Set() };
        current.count += 1;
        current.students.add(student.name);
        atRiskMap.set(log.reason, current);
      });
  });

  const atRisk = [...atRiskMap.values()].sort((left, right) => right.count - left.count);
  const classAverageScore = allStudents.length
    ? Math.round((allStudents.reduce((total, student) => total + student.calculatedScore, 0) / allStudents.length) * 100) / 100
    : 0;

  const totalClassRank = allStudents.reduce((total, student) => {
    const rankMap = { 'Xuất sắc': 5, 'Tốt': 4, 'Khá': 3, 'Trung bình': 2, 'Yếu': 1 };
    return total + (rankMap[student.overallGrade] || 1);
  }, 0);
  const avgClassRank = allStudents.length ? Math.round(totalClassRank / allStudents.length) : 0;
  const reversedRankMap = { 5: 'Xuất sắc', 4: 'Tốt', 3: 'Khá', 2: 'Trung bình', 1: 'Yếu' };

  return {
    classes: processedClasses,
    students: allStudents,
    currentWeek,
    weeklyAverages,
    gradeBuckets,
    totalStudents: allStudents.length,
    classAverageScore,
    classRank: reversedRankMap[avgClassRank] || '-',
    atRisk,
    topPerformerThisWeek,
    sortedByPerformance,
  };
};

export const parseRulesFromText = (text) => {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const plusMatch = line.match(/(?:cộng|thưởng|\+)\s*(\d+)/i);
      const minusMatch = line.match(/(?:trừ|-)\s*(\d+)/i);
      const points = plusMatch ? Number(plusMatch[1]) : minusMatch ? -Number(minusMatch[1]) : 0;
      const [name] = line.split(/[:(-]/);

      return ensureRule({
        id: `parsed-${index}-${Date.now()}`,
        category: 'Quy tắc tùy chỉnh',
        reason: name?.trim() || line,
        defaultPoints: points,
        source: 'parsed',
      });
    });
};
