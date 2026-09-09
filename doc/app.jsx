import React, { useState, useEffect } from 'react';

export default function App() {
  // 현재 탭 상태 ('main': 메인 화면, 'admin': 시간표/식단 관리)
  const [currentTab, setCurrentTab] = useState('main');

  // 반 선택 상태
  const [selectedGrade, setSelectedGrade] = useState('2');
  const [selectedClass, setSelectedClass] = useState('3');
  const [selectedDay, setSelectedDay] = useState('월');

  // 시간표 데이터 (로컬 스토리지 연동)
  const [timetable, setTimetable] = useState(() => {
    const saved = localStorage.getItem('school_timetable');
    return saved ? JSON.parse(saved) : {
      '2-3-월': ['문학', '확률과 통계', '영어 I', '한국사', '물리학 I', '체육', '동아리'],
      '2-3-화': ['영어 I', '문학', '화학 I', '수학 II', '정보', '음악', '진로활동'],
    };
  });

  // 오늘의 급식 메뉴 (API 연동 또는 수동 입력)
  const [todayMenu, setTodayMenu] = useState([
    '흑미밥', '차돌된장찌개', '치킨마요강정', '배추김치', '오이무침', '청포도에이드'
  ]);

  // 실시간 혼잡도 상태
  const [cafeteriaStatus, setCafeteriaStatus] = useState({ text: '확인 중...', badge: 'loading', desc: '시간을 계산하고 있어요.' });

  // 실시간 혼잡도 자동 계산 로직
  useEffect(() => {
    const checkCafeteriaStatus = () => {
      const now = new Date();
      const totalMinutes = now.getHours() * 60 + now.getMinutes();

      const lunchStart = 12 * 60 + 30;     // 12:30
      const lunchPeakEnd = 13 * 60 + 0;   // 13:00
      const lunchEnd = 13 * 60 + 30;       // 13:30

      if (totalMinutes >= lunchStart && totalMinutes <= lunchPeakEnd) {
        setCafeteriaStatus({
          text: '지금 가면 복잡해요! 🚨',
          badge: 'danger',
          desc: '사람이 가장 몰리는 피크 타임이에요. 줄이 길 수 있어요!'
        });
      } else if (totalMinutes > lunchPeakEnd && totalMinutes <= lunchEnd) {
        setCafeteriaStatus({
          text: '딱 좋아요! ✨',
          badge: 'success',
          desc: '자리가 여유롭고 줄이 거의 없어요. 지금이 최적의 타이밍!'
        });
      } else if (totalMinutes >= 11 * 60 + 50 && totalMinutes < lunchStart) {
        setCafeteriaStatus({
          text: '한가해요 (준비중) 🍃',
          badge: 'warning',
          desc: '배식 직전이라 곧 사람이 몰릴 수 있으니 서두르세요!'
        });
      } else {
        setCafeteriaStatus({
          text: '한가해요 🍃',
          badge: 'normal',
          desc: '현재는 식사 시간 외라 아주 여유롭습니다.'
        });
      }
    };

    checkCafeteriaStatus();
    const interval = setInterval(checkCafeteriaStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 시간표 저장 핸들러
  const handleTimetableChange = (index, value) => {
    const key = `${selectedGrade}-${selectedClass}-${selectedDay}`;
    const currentList = timetable[key] || ['', '', '', '', '', '', ''];
    const updatedList = [...currentList];
    updatedList[index] = value;

    const newTimetable = { ...timetable, [key]: updatedList };
    setTimetable(newTimetable);
    localStorage.setItem('school_timetable', JSON.stringify(newTimetable));
  };

  const currentKey = `${selectedGrade}-${selectedClass}-${selectedDay}`;
  const currentTimetableList = timetable[currentKey] || Array(7).fill('등록된 시간표가 없어요');

  return (
    <div style={styles.container}>
      {/* 상단 타이틀 */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>🏫 우리학교 생활 안내</h1>
        <div style={styles.tabButtons}>
          <button 
            onClick={() => setCurrentTab('main')} 
            style={{ ...styles.tabBtn, backgroundColor: currentTab === 'main' ? '#4a90e2' : '#e4e6eb', color: currentTab === 'main' ? '#fff' : '#333' }}
          >
            홈
          </button>
          <button 
            onClick={() => setCurrentTab('admin')} 
            style={{ ...styles.tabBtn, backgroundColor: currentTab === 'admin' ? '#4a90e2' : '#e4e6eb', color: currentTab === 'admin' ? '#fff' : '#333' }}
          >
            시간표 설정
          </button>
        </div>
      </header>

      {currentTab === 'main' ? (
        <>
          {/* 반 선택바 */}
          <div style={styles.filterBox}>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={styles.select}>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={styles.select}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(c => <option key={c} value={c}>{c}반</option>)}
            </select>
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} style={styles.select}>
              {['월', '화', '수', '목', '금'].map(d => <option key={d} value={d}>{d요일</option>)}
            </select>
          </div>

          {/* 1단: 시간표 */}
          <section style={styles.card}>
            <div style={styles.cardTitle}>📅 {selectedGrade}학년 {selectedClass}반 ({selectedDay}요일) 시간표</div>
            <div style={styles.timetableGrid}>
              {currentTimetableList.map((subject, idx) => (
                <div key={idx} style={styles.timeBox}>
                  <span style={styles.periodNum}>{idx + 1}교시</span>
                  <span style={styles.subjectName}>{subject || '-'}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 2단: 급식 식단표 */}
          <section style={styles.card}>
            <div style={styles.cardTitle}>📋 오늘의 점심 메뉴 (중식)</div>
            <ul style={styles.menuList}>
              {todayMenu.map((menu, idx) => (
                <li key={idx} style={styles.menuItem}>▫️ {menu}</li>
              ))}
            </ul>
          </section>

          {/* 3단: 실시간 급식실 혼잡도 */}
          <section style={{ ...styles.card, ...styles.statusCard(cafeteriaStatus.badge) }}>
            <div style={styles.statusHeader}>🍳 지금 급식실 상태는?</div>
            <div style={styles.statusMainText}>{cafeteriaStatus.text}</div>
            <p style={styles.statusDesc}>{cafeteriaStatus.desc}</p>
          </section>
        </>
      ) : (
        /* 시간표 등록 및 관리 화면 */
        <section style={styles.card}>
          <div style={styles.cardTitle}>⚙️ 시간표 직접 등록 및 수정</div>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
            원하는 학년, 반, 요일을 선택하고 과목명을 입력하면 실시간으로 저장됩니다.
          </p>
          
          <div style={{ ...styles.filterBox, marginBottom: '16px' }}>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={styles.select}>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={styles.select}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(c => <option key={c} value={c}>{c}반</option>)}
            </select>
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} style={styles.select}>
              {['월', '화', '수', '목', '금'].map(d => <option key={d} value={d}>{`${d}요일`}</option>)}
            </select>
          </div>

          <div style={styles.timetableGrid}>
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ width: '50px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>{idx + 1}교시</span>
                <input 
                  type="text" 
                  value={currentTimetableList[idx] || ''} 
                  onChange={(e) => handleTimetableChange(idx, e.target.value)}
                  placeholder="과목명 입력 (예: 수학)"
                  style={styles.inputField}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// 모바일 최적화 스타일
const styles = {
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f4f6f8',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  tabButtons: {
    display: 'flex',
    gap: '6px',
  },
  tabBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  filterBox: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  select: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '14px',
    backgroundColor: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#4a90e2',
    marginBottom: '12px',
  },
  timetableGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  timeBox: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    fontSize: '14px',
  },
  periodNum: {
    color: '#888',
    fontWeight: '600',
  },
  subjectName: {
    color: '#333',
    fontWeight: 'bold',
  },
  menuList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  menuItem: {
    fontSize: '14px',
    color: '#444',
    padding: '4px 0',
  },
  statusCard: (badgeType) => ({
    backgroundColor: badgeType === 'danger' ? '#fff5f5' : badgeType === 'success' ? '#f0fff4' : '#fffbeb',
    border: `1px solid ${badgeType === 'danger' ? '#feb2b2' : badgeType === 'success' ? '#9ae6b4' : '#f6e05e'}`,
    textAlign: 'center',
  }),
  statusHeader: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '6px',
  },
  statusMainText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#222',
    marginBottom: '6px',
  },
  statusDesc: {
    fontSize: '12px',
    color: '#555',
    margin: 0,
  },
  inputField: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
};