import cv2
from ultralytics import YOLO

# 1. 사전 학습된 YOLOv8 가볍고 빠른 모델 로드(n버전:Nano)
# 처음 실행시 자동으로 모델파일(yolov8n.pt) 을 다운로드 합니다.
model = YOLO('yolov8n.pt')

# 2. 비디오 소스 연결(0번: 웹캠, 혹은 CCTV의 RTSP 스트림 주소 입력 가능)
# 예: cap = cv2.VideoCapture("rtsp://username:password@ip_address:port/stream")
cap = cv2.VideoCapture(0)

# 카메라가 정상적으로 열렸는지 확인
if not cap.isOpened():
    print ("오류: 카메라를 열 수 없습니다.")
    exit()
    
print ("급식실 혼잡도 측정 시스템 구동 중... (종료하려면 'q' 키를 누르세요)")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        print ("프레임을 읽을 수 없습니다.")
        break
        
    # 3. YOLO 모델로 객체 탐지 수행(conf=0.5는 정확도 50% 이상만 필터링)
    results = model(frame, conf=0.5)
    
    person_count = 0
    
    # 4. 탐지된 결과 분석
    for result in results:
        boxes = result.boxes
        for box in boxes:
            # 클래스 번호 확인 (YOLOv8 기본 데이터셋에서 0번은 'person' 사람입니다.)
            cls = int(box.cls[0])
            if cls == 0:  # 사람이 감지된 경우
                person_count += 1
                
                # 바운딩 박스 좌표 추출
                x1, y1, x2, y3 = map(int, box.xyxy[0])
                
                # 화면에 사람 주변으로 초록색 박스 그리기
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
    
    # 5. 화면 상단에 현재 인원수(혼잡도) 텍스트 출력
    text = f"Current People Count : {person_count}"
    
    # 인원수에 따라 경고 색상 변경 (예: 5명 초과시 빨간색)
    color = (0, 0, 255) if person_count > 5 else (255, 255, 255)
    cv2.putText(frame, text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)
    
    # 6. 결과 화면 출력
    cv2.imshow('Cafeteria Congestion Monitoring', frame)
    
    # 'q' 키를 누르면 프로그램 종료하려면
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
      
# 지원해제
cap.release()
cv2.destoryAllWindows()

# pip install opencv-python ultralytics

# 혼잡도 단계화: 단순이 인원수만 띄우는 것보다, 인원수에 따라[여유 / 보통 / 혼잡]단계를 자동
# 으로 계산
# 데이터저장 : 이 인원수를 데이터를 5분 단위로 수잡해 엑셀이나 데이터베이스에 저장 하면
#             "어느 시간대에 가장 사람이 몰리는지" 통계 분석 자료로는 확장할 수 있음  
            
    