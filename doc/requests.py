from datetime import datetime
import requests

# 오늘 날짜를 자동으로 YYYYMMDD 형식으로 가져오기 (예: 20260909)
DATE = datetime.today().strftime('%Y%m%d')

API_KEY = "발급받은_인증키" 9cdb26293638488ba376fe08eb858829
ATPT_OFCDC_SC_CODE = "J10"   # 경기도 교육청(구리남양주교육지원청)  예시
SD_SCHUL_CODE = "18823" "7530557"    # 학교 코드 예시

url = f"https://open.neis.go.kr/hub/mealServiceDietInfo?KEY={API_KEY}&Type=json&ATPT_OFCDC_SC_CODE={ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE={SD_SCHUL_CODE}&MLSV_YMD={DATE}"

response = requests.get(url)
data = response.json()

try:
    meal_info = data['mealServiceDietInfo'][1]['row'][0]['DDISH_NM']
    menu_list = [item.strip() for item in meal_info.split('<br/>')]
    print(f"오늘({DATE})의 급식:", menu_list)
except (KeyError, IndexError):
    print("오늘 등록된 급식 정보가 없어요. (주말이나 공휴일일 수 있어요)")