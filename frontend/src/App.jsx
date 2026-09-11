import React, { useState, useEffect } from 'react';

// Vercel에서는 VITE_API_BASE_URL에 Google Cloud 백엔드의 공개 주소를 설정한다.
// 로컬 개발 중에는 설정하지 않으면 기존 FastAPI 주소를 사용한다.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

// 🗓️ 날짜 문자열을 넣으면 요일(월, 화, 수, 목, 금, 토, 일)을 반환하는 헬퍼 함수
const getDayOfWeek = (dateString) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayIndex = new Date(dateString).getDay();
  return days[dayIndex];
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('main');
  const [selectedGrade, setSelectedGrade] = useState('2');
  const [selectedClass, setSelectedClass] = useState('3');

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [selectedDay, setSelectedDay] = useState(() => {
    const calculatedDay = getDayOfWeek(todayStr);
    return ['월', '화', '수', '목', '금'].includes(calculatedDay) ? calculatedDay : '월';
  });

  const [timetable, setTimetable] = useState({});
  const [currentDailyMenu, setCurrentDailyMenu] = useState(['급식 정보를 불러오는 중...']);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [mealCache, setMealCache] = useState({});
  
  // 🍳 세분화된 실시간 급식실 혼잡도 상태
  const [cafeteriaStatus, setCafeteriaStatus] = useState({ text: '확인 중...', badge: 'loading', desc: '시간을 계산하고 있어요.' });

  const [editList, setEditList] = useState(Array(7).fill(''));
  const currentKey = `${selectedGrade}-${selectedClass}-${selectedDay}`;

  // 백엔드에서 시간표 불러오기
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/timetable`);
        const result = await response.json();
        if (result.status === 'success') {
          setTimetable(result.data);
        }
      } catch (error) {
        console.error('시간표를 불러오지 못했습니다:', error);
      }
    };
    fetchTimetable();
  }, []);

  // 학년, 반, 요일이 바뀔 때마다 편집용 리스트 동기화
  useEffect(() => {
    const currentList = timetable[currentKey] || Array(7).fill('');
    const padded = [...currentList, ...Array(7).fill('')].slice(0, 7);
    setEditList(padded);
  }, [selectedGrade, selectedClass, selectedDay, timetable]);

  // 날짜 변경 시 요일 자동 연동
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);

    const calculatedDay = getDayOfWeek(newDate);
    if (['월', '화', '수', '목', '금'].includes(calculatedDay)) {
      setSelectedDay(calculatedDay);
    }
  };

  // 급식 데이터 가져오기
  useEffect(() => {
    const fetchMealData = async () => {
      const dateParam = selectedDate.replace(/-/g, '');
      if (mealCache[dateParam]) {
        setCurrentDailyMenu(mealCache[dateParam]);
        return;
      }

      setLoadingMeal(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/meal?date=${dateParam}`);
        const result = await response.json();

        if (result.status === 'success') {
          const row = result.data.mealServiceDietInfo[1].row[0];
          const menuString = row.DDISH_NM;
          const menus = menuString
            .split('<br/>')
            .map(item => item.replace(/[0-9.().]/g, '').trim())
            .filter(Boolean);
            
          setMealCache(prev => ({ ...prev, [dateParam]: menus }));
          setCurrentDailyMenu(menus);
        } else {
          setCurrentDailyMenu([result.message || '해당 날짜의 급식 정보가 없습니다 🥲']);
        }
      } catch (error) {
        setCurrentDailyMenu(['서버와 연결할 수 없습니다. FastAPI 서버를 켜주세요! 🔌']);
      } finally {
        setLoadingMeal(false);
      }
    };

    fetchMealData();
  }, [selectedDate]);

  // 🍳 세분화된 실시간 급식실 혼잡도 체크 로직 (요청하신 구간 반영!)
  useEffect(() => {
    const checkCafeteriaStatus = () => {
      const now = new Date();
      const totalMinutes = now.getHours() * 60 + now.getMinutes();

      const time1150 = 11 * 60 + 50; // 11:50
      const time1230 = 12 * 60 + 30; // 12:30
      const time1250 = 12 * 60 + 50; // 12:50
      const time1310 = 13 * 60 + 10; // 13:10
      const time1330 = 13 * 60 + 30; // 13:30

      if (totalMinutes >= time1230 && totalMinutes < time1250) {
        // 12:30 ~ 12:50 : 가장 붐빔 (피크)
        setCafeteriaStatus({ 
          text: '🚨 극혼잡 (피크 타임!)', 
          badge: 'danger', 
          desc: '사람이 가장 몰리는 시간이에요. 줄이 가장 길어요!' 
        });
      } else if (totalMinutes >= time1250 && totalMinutes < time1310) {
        // 12:50 ~ 13:10 : 보통
        setCafeteriaStatus({ 
          text: '⚠️ 보통 (서서히 줄어듦)', 
          badge: 'warning', 
          desc: '피크 타임은 지났지만 아직 자리가 조금 바쁩니다.' 
        });
      } else if (totalMinutes >= time1310 && totalMinutes <= time1330) {
        // 13:10 이후 ~ 마감 : 여유로움
        setCafeteriaStatus({ 
          text: '✨ 여유로움 (지금이 기회!)', 
          badge: 'success', 
          desc: '자리가 널널하고 줄이 거의 없어요.' 
        });
      } else if (totalMinutes >= time1150 && totalMinutes < time1230) {
        // 11:50 ~ 12:30 : 준비 중
        setCafeteriaStatus({ 
          text: '⏳ 준비 중 (곧 붐빔)', 
          badge: 'preparing', 
          desc: '배식 직전이라 곧 사람이 몰릴 수 있어요!' 
        });
      } else {
        // 그 외 시간
        setCafeteriaStatus({ 
          text: '🍃 한가해요', 
          badge: 'normal', 
          desc: '현재는 식사 시간 외라 아주 여유롭습니다.' 
        });
      }
    };

    checkCafeteriaStatus();
    const interval = setInterval(checkCafeteriaStatus, 10000); // 10초마다 실시간 갱신
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (index, value) => {
    const updated = [...editList];
    updated[index] = value;
    setEditList(updated);
  };

  const handleDeleteItem = (index) => {
    const updated = [...editList];
    updated[index] = '';
    setEditList(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('정말 이 요일의 시간표를 전부 비우시겠습니까?')) {
      setEditList(Array(7).fill(''));
    }
  };

  const handleSaveTimetable = async () => {
    const newTimetable = { ...timetable, [currentKey]: editList };
    setTimetable(newTimetable);

    try {
      const response = await fetch(`${API_BASE_URL}/api/timetable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTimetable),
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert('✨ 시간표가 성공적으로 저장되었습니다!');
      }
    } catch (error) {
      alert('❌ 서버 저장 실패! 백엔드 연결을 확인해주세요.');
      console.error(error);
    }
  };

  const currentTimetableList = timetable[currentKey] || Array(7).fill('등록된 시간표가 없어요');

  return (
    <div style={styles.phoneFrame}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>🌸 우리학교 생활 안내</h1>
          <div style={styles.tabButtons}>
            <button 
              onClick={() => setCurrentTab('main')} 
              style={{ ...styles.tabBtn, backgroundColor: currentTab === 'main' ? '#ff758c' : '#fff0f3', color: currentTab === 'main' ? '#fff' : '#ff758c' }}
            >
              홈
            </button>
            <button 
              onClick={() => setCurrentTab('admin')} 
              style={{ ...styles.tabBtn, backgroundColor: currentTab === 'admin' ? '#ff758c' : '#fff0f3', color: currentTab === 'admin' ? '#fff' : '#ff758c' }}
            >
              시간표 설정
            </button>
          </div>
        </header>

        {currentTab === 'main' ? (
          <>
            {/* 🍳 가장 강조된 메인 '실시간 급식실 혼잡도' 카드 */}
            <section style={{ ...styles.card, ...styles.statusCard(cafeteriaStatus.badge) }}>
              <div style={styles.statusHeader}>🍳 실시간 급식실 혼잡도 안내</div>
              <div style={styles.statusMainText}>{cafeteriaStatus.text}</div>
              <p style={styles.statusDesc}>{cafeteriaStatus.desc}</p>
            </section>

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
                {['월', '화', '수', '목', '금'].map(d => <option key={d} value={d}>{`${d}요일`}</option>)}
              </select>
            </div>

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

            <section style={styles.card}>
              <div style={styles.menuHeaderRow}>
                <div style={{ ...styles.cardTitle, margin: 0 }}>📋 급식 식단표 (나이스 연동)</div>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={handleDateChange}
                  style={styles.datePicker}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                🗓️ 선택한 날짜: {selectedDate} ({selectedDay}요일) {loadingMeal && '(불러오는 중...)'}
              </div>
              <div style={styles.menuGrid}>
                {currentDailyMenu.map((menu, idx) => (
                  <div key={idx} style={styles.menuItemBox}>
                    <span>✨ {menu}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <section style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ ...styles.cardTitle, margin: 0 }}>⚙️ 시간표 등록 및 수정</div>
                <button onClick={handleClearAll} style={styles.clearAllBtn}>전체 비우기</button>
              </div>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '10px', lineHeight: '1.4' }}>
                과목을 수정하거나 삭제한 뒤, 하단의 <b>[저장하기]</b> 버튼을 꼭 눌러주세요! 💖
              </p>
              
              <div style={{ ...styles.filterBox, marginBottom: '10px' }}>
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
                {editList.map((subject, idx) => (
                  <div key={idx} style={styles.inputRow}>
                    <span style={styles.inputPeriodNum}>{idx + 1}교시</span>
                    <input 
                      type="text" 
                      value={subject} 
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      placeholder="과목명 입력"
                      style={styles.inputField}
                    />
                    <button onClick={() => handleDeleteItem(idx)} style={styles.deleteBtn}>삭제</button>
                  </div>
                ))}
              </div>

              <button onClick={handleSaveTimetable} style={styles.saveBtn}>
                💾 시간표 저장하기
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  phoneFrame: { width: '100%', maxWidth: '412px', margin: '0 auto', backgroundColor: '#fff5f7', minHeight: '100vh', boxShadow: '0 0 20px rgba(0,0,0,0.08)', boxSizing: 'border-box' },
  container: { padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 2px' },
  headerTitle: { fontSize: '15px', fontWeight: 'bold', color: '#ff477e', margin: 0 },
  tabButtons: { display: 'flex', gap: '4px' },
  tabBtn: { padding: '4px 8px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(255, 117, 140, 0.2)' },
  filterBox: { display: 'flex', gap: '5px', marginBottom: '10px' },
  select: { flex: 1, padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #ffccd5', fontSize: '12px', backgroundColor: '#fff', color: '#d6336c', fontWeight: 'bold', outline: 'none' },
  card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(255, 182, 193, 0.15)', border: '1px solid #ffe3e6' },
  cardTitle: { fontSize: '13px', fontWeight: 'bold', color: '#ff477e', marginBottom: '8px' },
  menuHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  datePicker: { padding: '3px 6px', borderRadius: '6px', border: '1px solid #ffccd5', fontSize: '11px', backgroundColor: '#fff9fb', color: '#d6336c', fontWeight: 'bold', outline: 'none' },
  timetableGrid: { display: 'flex', flexDirection: 'column', gap: '5px' },
  timeBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', backgroundColor: '#fff9fb', borderRadius: '6px', fontSize: '12px', border: '1px solid #ffe3e6' },
  periodNum: { color: '#ff85a1', fontWeight: '600', fontSize: '11px' },
  subjectName: { color: '#495057', fontWeight: 'bold' },
  menuGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' },
  menuItemBox: { fontSize: '12px', color: '#495057', padding: '6px 8px', backgroundColor: '#fff9fb', borderRadius: '6px', border: '1px solid #ffe3e6', fontWeight: 'bold' },
  
  // 🍳 세분화된 혼잡도 카드 스타일 (배지 종류별 색상 뚜렷하게 분기)
  statusCard: (badgeType) => ({ 
    backgroundColor: badgeType === 'danger' ? '#fff5f5' : badgeType === 'warning' ? '#fffaf0' : badgeType === 'success' ? '#f0fff4' : badgeType === 'preparing' ? '#f7fafc' : '#fffdf0', 
    border: `2px solid ${badgeType === 'danger' ? '#fc8181' : badgeType === 'warning' ? '#f6ad55' : badgeType === 'success' ? '#68d391' : badgeType === 'preparing' ? '#cbd5e0' : '#ffe066'}`, 
    textAlign: 'center',
    padding: '16px'
  }),
  statusHeader: { fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statusMainText: { fontSize: '18px', fontWeight: '900', color: '#2d3748', marginBottom: '6px' },
  statusDesc: { fontSize: '11px', color: '#4a5568', margin: 0, fontWeight: '500' },

  inputRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  inputPeriodNum: { width: '45px', fontSize: '11px', fontWeight: 'bold', color: '#ff85a1', flexShrink: 0 },
  inputField: { flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #ffccd5', fontSize: '12px', backgroundColor: '#fff9fb', outline: 'none', color: '#333' },
  deleteBtn: { padding: '6px 10px', backgroundColor: '#fff0f3', color: '#ff477e', border: '1px solid #ffccd5', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  clearAllBtn: { padding: '3px 8px', backgroundColor: '#fff', color: '#888', border: '1px solid #ddd', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' },
  saveBtn: { width: '100%', marginTop: '12px', padding: '10px', backgroundColor: '#ff758c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 8px rgba(255, 117, 140, 0.3)' }
};
