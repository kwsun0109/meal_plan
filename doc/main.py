from fastapi import FastAPI, UploadFile, File, HTTPException
import pandas as pd
import pdfplumber
import io
import json
import re

app = FastAPI()

@app.post("/api/convert-menu")
async def convert_any_file_to_json(file: UploadFile = File(...)):
    filename = file.filename.lower()
    contents = await file.read()
    
    menu_data = {}

    try:
        # 1. 엑셀 파일인 경우 (.xlsx, .xls)
        if filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents), header=None)
            
            # 표 전체를 돌며 숫자(날짜)와 주변 메뉴 텍스트 추출
            for r_idx in range(len(df)):
                for c_idx in range(len(df.columns)):
                    cell_value = str(df.iloc[r_idx, c_idx]).strip()
                    if cell_value.isdigit():
                        day_num = int(cell_value)
                        if 1 <= day_num <= 31:
                            date_str = f"2026-09-{str(day_num).zfill(2)}" # 예시 연/월
                            dishes = []
                            for offset in range(1, 5):
                                if r_idx + offset < len(df):
                                    sub_val = str(df.iloc[r_idx + offset, c_idx]).strip()
                                    if sub_val and sub_val != 'nan' and not sub_val.isdigit():
                                        split_items = [i.strip() for i in sub_val.split('\n') if i.strip()]
                                        dishes.extend(split_items)
                            if dishes:
                                menu_data[date_str] = list(dict.fromkeys(dishes))

        # 2. PDF 파일인 경우 (.pdf)
        elif filename.endswith('.pdf'):
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if not text:
                        continue
                    lines = text.split('\n')
                    current_date = None
                    
                    for line in lines:
                        # '9일' 같은 날짜 패턴 감지
                        date_match = re.search(r'(\d{1,2})일', line)
                        if date_match:
                            day = date_match.group(1).zfill(2)
                            current_date = f"2026-09-{day}"
                            menu_data[current_date] = []
                        elif current_date and line.strip():
                            menu_data[current_date].append(line.strip())
        else:
            raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다. (엑셀 또는 PDF만 가능)")

        return {
            "status": "success",
            "filename": file.filename,
            "data": menu_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 변환 중 오류 발생: {str(e)}")

# 서버 실행 방법: uvicorn main:app --reload
# pip install pandas openpyxl pdfplumber fastapi uvicorn