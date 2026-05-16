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

export const DEFAULT_RANKINGS = [
  { name: 'Xuất sắc', min: 180, color: '#ffb300' },
  { name: 'Tốt', min: 150, color: '#00c6f7' },
  { name: 'Khá', min: 130, color: '#00b800' },
  { name: 'Trung bình', min: 100, color: '#0073f7' },
  { name: 'Yếu', min: 0, color: '#5f16c4' },
];

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

  let parsedValue = value;
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    parsedValue = `${year}-${month}-${day}`;
  }

  const date = new Date(parsedValue);
  if (Number.isNaN(date.getTime())) {
    return String(value); // fallback to original string if not a valid date
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

export const getBehaviorGrade = (score, rankings = DEFAULT_RANKINGS) => {
  const actualRankings = Array.isArray(rankings) && rankings.length > 0 
    ? [...rankings].sort((a, b) => b.min - a.min) 
    : DEFAULT_RANKINGS;
  const found = actualRankings.find((r) => score >= r.min);
  return found ? found.name : (actualRankings[actualRankings.length - 1]?.name || 'Yếu');
};

export const getAcademicGrade = (score, rankings = DEFAULT_RANKINGS) => {
  const actualRankings = Array.isArray(rankings) && rankings.length > 0 
    ? [...rankings].sort((a, b) => b.min - a.min) 
    : DEFAULT_RANKINGS;
  const found = actualRankings.find((r) => score >= r.min);
  return found ? found.name : (actualRankings[actualRankings.length - 1]?.name || 'Yếu');
};

export const getOverallGrade = (behaviorGrade, academicGrade, rankings = DEFAULT_RANKINGS) => {
  const actualRankings = Array.isArray(rankings) && rankings.length > 0 
    ? [...rankings].sort((a, b) => b.min - a.min) 
    : DEFAULT_RANKINGS;
  const findRank = (name) => {
    const idx = actualRankings.findIndex((r) => r.name === name);
    return idx === -1 ? actualRankings.length : idx + 1; // 1 is highest, actualRankings.length is lowest
  };

  const bRank = findRank(behaviorGrade);
  const aRank = findRank(academicGrade);
  const avgRank = Math.round((bRank + aRank) / 2);
  
  return actualRankings[avgRank - 1]?.name || actualRankings[actualRankings.length - 1]?.name || 'Yếu';
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

export const ensureStudent = (student, index = 0) => {
  if (student?._ensured) return student;
  return {
    id: student?.id || `student-${index}-${createId()}`,
    name: student?.name || 'Học sinh chưa đặt tên',
    dob: normalizeDateInput(student?.dob),
    pob: student?.pob || '',
    score: toNumber(student?.score ?? student?.academicScore ?? BASE_SCORE, BASE_SCORE),
    disciplineScore: toNumber(student?.disciplineScore ?? BASE_SCORE, BASE_SCORE),
    studyRank: student?.studyRank || '',
    disciplineRank: student?.disciplineRank || '',
    notes: student?.notes || '',
    logs: Array.isArray(student?.logs) ? student.logs.map(ensureLog) : [],
    createdAt: toNumber(student?.createdAt, Date.now()),
    _ensured: true
  };
};

export const ensureClass = (item, index = 0) => ({
  id: item?.id || `class-${index}-${createId()}`,
  name: item?.name || 'Lớp mới',
  teacher: item?.teacher || '',
  notes: item?.notes || '',
  students: Array.isArray(item?.students) ? item.students.map(ensureStudent) : [],
  createdAt: toNumber(item?.createdAt, Date.now()),
});

export const ensureAchievement = (achievement, index = 0) => {
  if (achievement?._ensured) return achievement;
  return {
    id: achievement?.id || `achievement-${index}-${createId()}`,
    name: achievement?.name || 'Thành tích mới',
    achievementDate: normalizeDateInput(achievement?.achievementDate || achievement?.date),
    certifiedDate: normalizeDateInput(achievement?.certifiedDate || achievement?.date),
    _ensured: true
  };
};

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
  defaultClassDisciplineScore: toNumber(config?.defaultClassDisciplineScore, 100),
});

export const calculateStudentStatus = (student, disciplineRankings = DEFAULT_RANKINGS, studyRankings = DEFAULT_RANKINGS) => {
  const dRanks = Array.isArray(disciplineRankings) ? disciplineRankings : DEFAULT_RANKINGS;
  const sRanks = Array.isArray(studyRankings) ? studyRankings : DEFAULT_RANKINGS;
  
  // Fast path for ensures
  const ensuredStudent = ensureStudent(student);
  const logs = ensuredStudent.logs;
  const disciplineBase = ensuredStudent.score;
  const totalPointsScore = logs.reduce((total, log) => total + toNumber(log.points, 0), disciplineBase);
  const academicScore = disciplineBase; 
  
  const behaviorGrade = getBehaviorGrade(totalPointsScore, dRanks);
  const academicGrade = getAcademicGrade(academicScore, sRanks);

  return {
    ...ensuredStudent,
    academicScore,
    calculatedScore: totalPointsScore,
    behaviorScore: totalPointsScore,
    behaviorGrade,
    academicGrade,
    overallGrade: getOverallGrade(behaviorGrade, academicGrade, dRanks),
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

export const getClassWeekDisciplineScore = (dataset, week) => {
  const defaultScore = dataset?.scoring?.defaultClassDisciplineScore || BASE_SCORE;
  const allStudents = (dataset?.classes || []).flatMap((cls) => cls.students || []);
  const totalDeductions = allStudents.reduce((sum, student) => {
    const weekLogs = getLogsForWeek(student, week);
    // Student errors (negative points) subtract from the class score
    const deductions = weekLogs
      .filter((log) => toNumber(log.points, 0) < 0)
      .reduce((s, log) => s + Math.abs(toNumber(log.points, 0)), 0);
    return sum + deductions;
  }, 0);
  return Math.max(0, defaultScore - totalDeductions);
};

export const isPastFinalWeek = (weekConfig) => {
  const config = ensureWeekConfig(weekConfig);
  const endMs = new Date(config.endDate).getTime();
  // Buffer of 1 day to be sure
  return Date.now() > endMs + DAY_IN_MS;
};

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
  // Optimization: Single pass evaluation
  const dRanks = dataset?.disciplineRankings || DEFAULT_RANKINGS;
  const sRanks = dataset?.studyRankings || DEFAULT_RANKINGS;
  
  const processedClasses = (dataset?.classes || []).map(cls => ({
    ...cls,
    students: (cls.students || []).map(s => calculateStudentStatus(s, dRanks, sRanks))
  }));
  const allStudents = processedClasses.flatMap(cls => cls.students);
  const currentWeek = getCurrentWeek(dataset?.weekConfig || DEFAULT_WEEK_CONFIG);
  const weeklyAverages = getWeekRanges(dataset?.weekConfig || DEFAULT_WEEK_CONFIG).map((week) => {
    if (!allStudents.length) {
      return 0;
    }

    const avg = allStudents.reduce((total, student) => total + getStudentWeekScore(student, week), 0) / allStudents.length;
    return Math.round(avg * 100) / 100;
  });

  const rankings = dataset?.disciplineRankings || DEFAULT_RANKINGS;
  const gradeBuckets = {};
  rankings.forEach((r) => {
    gradeBuckets[r.name] = 0;
  });
  // Fallback for names not in current rankings
  const ensureGradeBucket = (grade) => {
    if (!gradeBuckets[grade]) gradeBuckets[grade] = 0;
  };

  allStudents.forEach((student) => {
    ensureGradeBucket(student.overallGrade);
    gradeBuckets[student.overallGrade] += 1;
  });

  const sortedByPerformance = [...allStudents].sort((left, right) => right.calculatedScore - left.calculatedScore);
  const weeklyScores = [...allStudents]
    .map((student) => ({ student, score: getStudentWeekScore(student, currentWeek) }))
    .sort((left, right) => right.score - left.score);

  const topPerformerThisWeek = (weeklyScores.length > 1 && weeklyScores[0].score === weeklyScores[1].score)
    ? null
    : weeklyScores[0];

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

  const currentClassDisciplineScore = getClassWeekDisciplineScore(dataset, currentWeek);

  const totalClassRank = allStudents.reduce((total, student) => {
    const findRankScore = (name) => {
      const idx = rankings.findIndex((r) => r.name === name);
      return idx === -1 ? 1 : rankings.length - idx; // highest name = max points
    };
    return total + findRankScore(student.overallGrade);
  }, 0);

  const avgClassRankScore = allStudents.length ? Math.round(totalClassRank / allStudents.length) : 0;
  const classRank = rankings[rankings.length - avgClassRankScore]?.name || '-';

  return {
    classes: processedClasses,
    students: allStudents,
    currentWeek,
    weeklyAverages,
    gradeBuckets,
    totalStudents: allStudents.length,
    classAverageScore,
    currentClassDisciplineScore,
    classRank,
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
