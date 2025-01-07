/*******************************************************************
 * 전역 데이터/상태
 *******************************************************************/
const csvFileInput  = document.getElementById('csvFileInput');
const saveFileLabel = document.getElementById('saveFileLabel');

const scoreTable    = document.getElementById('scoreTable');
const pageTitle     = document.getElementById('pageTitle');
const pageSubtitle  = document.getElementById('pageSubtitle');

// 인원 추가 버튼
const btnAddPerson  = document.getElementById('btnAddPerson');

// 라운드/구장/코스
const roundSelect          = document.getElementById('roundSelect');
const stadiumRoundSelect   = document.getElementById('stadiumRoundSelect');
const stadiumSelect        = document.getElementById('stadiumSelect');
const courseRoundSelect    = document.getElementById('courseRoundSelect');
const courseStadiumSelect  = document.getElementById('courseStadiumSelect');
const courseSelect         = document.getElementById('courseSelect');

const btnAddRound    = document.getElementById('btnAddRound');
const btnEditRound   = document.getElementById('btnEditRound');
const btnDelRound    = document.getElementById('btnDelRound');
const btnAddStadium  = document.getElementById('btnAddStadium');
const btnEditStadium = document.getElementById('btnEditStadium');
const btnDelStadium  = document.getElementById('btnDelStadium');
const btnAddCourse   = document.getElementById('btnAddCourse');
const btnEditCourse  = document.getElementById('btnEditCourse');
const btnDelCourse   = document.getElementById('btnDelCourse');

// 원본 파일명
let originalFileName = 'modified.csv';

// 고정 컬럼 (맨 왼쪽: (삭제) 버튼)
const fixedLeftCols  = ['(삭제)', '조', '성명', '시/도', '시작코스'];
// 고정 오른쪽
const fixedRightCols = ['모든일차합계', '최종순위'];

// 라운드 구조
let roundsData = {}; 
let tableData  = [];

// 각 컬럼별 정렬 상태
let sortState = {};

/*******************************************************************
 * 0. 테이블 캡처 (JPG) 기능
 *******************************************************************/
captureTableBtn.addEventListener('click', () => {
  captureTableAsJpg();
});

/**
 * 테이블을 캡처해 JPG로 다운로드
 */
function captureTableAsJpg() {
  // html2canvas: 특정 DOM 요소를 캡처
  html2canvas(scoreTable).then(canvas => {
    // JPG DataURL 생성 (품질 0.95 정도)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // 다운로드용 <a> 태그
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'scoreTable.jpg'; // 파일명
    // 링크 클릭
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}


/*******************************************************************
 * 1. CSV 불러오기
 *******************************************************************/
csvFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  originalFileName = file.name;

  const reader = new FileReader();
  reader.onload = evt => {
    const csvText = evt.target.result;
    const rows = parseCSV(csvText);

    if (rows.length < 3) {
      alert('CSV 최소 3줄(Title, SubTitle, Header)은 필요합니다.');
      return;
    }

    // Title, SubTitle
    if (rows[0][0] === 'Title')    pageTitle.innerText    = rows[0][1] || '';
    if (rows[1][0] === 'SubTitle') pageSubtitle.innerText = rows[1][1] || '';

    // 3행째: 헤더, 4행째~: 데이터
    const headerCols = rows[2];
    const bodyRows   = rows.slice(3);

    tableData = bodyRows.map(rArr => {
      const obj = {};
      headerCols.forEach((col, i) => {
        obj[col] = rArr[i] || '';
      });
      return obj;
    });

    parseDynamicColumns(headerCols);

    renderTable();
    updateDropdowns();
  };
  reader.readAsText(file, 'utf-8');
});

/*******************************************************************
 * 2. CSV 내보내기
 *******************************************************************/
saveFileLabel.addEventListener('click', () => {
  let userName = prompt('저장할 파일명을 입력하세요 (확장자 .csv는 자동)', originalFileName);
  if (!userName) return;

  // 확장자 .csv 자동 추가
  if (!/\.csv$/i.test(userName)) {
    userName += '.csv';
  }

  // CSV 구성
  const csvRows = [];
  csvRows.push(['Title', pageTitle.innerText.trim()]);
  csvRows.push(['SubTitle', pageSubtitle.innerText.trim()]);

  const headerCols = getAllColumns();
  csvRows.push(headerCols);

  tableData.forEach(rowObj => {
    const rowArr = headerCols.map(c => rowObj[c] || '');
    csvRows.push(rowArr);
  });

  const csvString = csvRows.map(r => r.join(',')).join('\n');
  const blob   = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);

  const aLink = document.createElement('a');
  aLink.href = url;
  aLink.download = userName;
  document.body.appendChild(aLink);
  aLink.click();
  document.body.removeChild(aLink);
  URL.revokeObjectURL(url);
});

/*******************************************************************
 * 3. 인원 추가 (빈 행)
 *******************************************************************/
btnAddPerson.addEventListener('click', () => {
  const newRow = {};
  const allCols = getAllColumns();
  allCols.forEach(col => {
    if (col === '(삭제)') return;
    newRow[col] = '';
  });
  tableData.push(newRow);
  renderTable();
});

/*******************************************************************
 * 4. 라운드/구장/코스 추가/수정/삭제
 *******************************************************************/

/*------- 일차(라운드) -------*/
btnAddRound.addEventListener('click', () => {
  const rName = roundSelect.value;
  if (!rName) return;
  if (roundsData[rName]) {
    alert(`"${rName}"는 이미 존재하는 일차입니다.`);
    return;
  }
  roundsData[rName] = {};
  renderTable();
  updateDropdowns();
});
btnEditRound.addEventListener('click', () => {
  const oldName = roundSelect.value;
  if (!oldName || !roundsData[oldName]) {
    alert(`"${oldName}" 일차가 없습니다.`);
    return;
  }
  const newName = prompt(`"${oldName}" → 변경?`, oldName);
  if (!newName || newName === oldName) return;
  if (roundsData[newName]) {
    alert('이미 동일한 일차가 있습니다.');
    return;
  }
  roundsData[newName] = roundsData[oldName];
  delete roundsData[oldName];
  renameColumnPrefix(oldName + '_', newName + '_');
  renderTable();
  updateDropdowns();
});
btnDelRound.addEventListener('click', () => {
  const rName = roundSelect.value;
  if (!rName || !roundsData[rName]) {
    alert(`"${rName}" 일차를 찾을 수 없음.`);
    return;
  }
  if (!confirm(`"${rName}"을(를) 삭제?`)) return;
  delete roundsData[rName];
  tableData.forEach(row => {
    for (const key in row) {
      if (key.startsWith(rName + '_')) {
        delete row[key];
      }
    }
  });
  renderTable();
  updateDropdowns();
});

/*------- 구장 -------*/
btnAddStadium.addEventListener('click', () => {
  const rName = stadiumRoundSelect.value;
  if (!rName || !roundsData[rName]) {
    alert('일차 없음.');
    return;
  }
  const sName = prompt(`${rName}에 추가할 구장명? (예: "1구장")`);
  if (!sName) return;
  if (roundsData[rName][sName]) {
    alert('이미 존재하는 구장!');
    return;
  }
  roundsData[rName][sName] = [];

  // 합계 칼럼 추가
  const sumCol = `${rName}_${sName}_합계`;
  const daySum = `${rName}_합계`;
  tableData.forEach(r => {
    if (r[sumCol] === undefined) r[sumCol] = '';
    if (r[daySum] === undefined) r[daySum] = '';
  });
  renderTable();
  updateDropdowns();
});
btnEditStadium.addEventListener('click', () => {
  const rName = stadiumRoundSelect.value;
  if (!rName || !roundsData[rName]) {
    alert('일차 오류.');
    return;
  }
  const oldS = stadiumSelect.value;
  if (!oldS || !roundsData[rName][oldS]) {
    alert('구장 선택 오류.');
    return;
  }
  const newS = prompt(`"${oldS}" → 새 구장명?`, oldS);
  if (!newS || newS === oldS) return;
  if (roundsData[rName][newS]) {
    alert('이미 동일 구장!');
    return;
  }
  roundsData[rName][newS] = roundsData[rName][oldS];
  delete roundsData[rName][oldS];
  renameColumnPrefix(`${rName}_${oldS}_`, `${rName}_${newS}_`);
  renderTable();
  updateDropdowns();
});
btnDelStadium.addEventListener('click', () => {
  const rName = stadiumRoundSelect.value;
  if (!rName || !roundsData[rName]) {
    alert('일차 선택 오류.');
    return;
  }
  const sName = stadiumSelect.value;
  if (!sName || !roundsData[rName][sName]) {
    alert('구장 선택 오류.');
    return;
  }
  if (!confirm(`"${rName} / ${sName}" 삭제?`)) return;
  delete roundsData[rName][sName];
  tableData.forEach(row => {
    for (const key in row) {
      if (key.startsWith(`${rName}_${sName}_`)) {
        delete row[key];
      }
    }
  });
  renderTable();
  updateDropdowns();
});

/*------- 코스 -------*/
btnAddCourse.addEventListener('click', () => {
  const rName = courseRoundSelect.value;
  const sName = courseStadiumSelect.value;
  if (!rName || !roundsData[rName] || !roundsData[rName][sName]) {
    alert('일차/구장 선택 오류.');
    return;
  }
  const cName = prompt(`"${rName} / ${sName}"에 추가할 코스명?`);
  if (!cName) return;
  if (roundsData[rName][sName].includes(cName)) {
    alert('이미 동일 코스!');
    return;
  }
  roundsData[rName][sName].push(cName);

  const newCol = `${rName}_${sName}_${cName}`;
  tableData.forEach(row => {
    if (row[newCol] === undefined) row[newCol] = '';
  });
  renderTable();
  updateDropdowns();
});
btnEditCourse.addEventListener('click', () => {
  const rName = courseRoundSelect.value;
  const sName = courseStadiumSelect.value;
  const oldC  = courseSelect.value;
  if (!rName || !sName || !oldC) {
    alert('선택 오류.');
    return;
  }
  if (!roundsData[rName][sName] || !roundsData[rName][sName].includes(oldC)) {
    alert('해당 코스 없음.');
    return;
  }
  const newC = prompt(`"${oldC}" → 새 코스명?`, oldC);
  if (!newC || newC === oldC) return;
  if (roundsData[rName][sName].includes(newC)) {
    alert('이미 동일 코스명!');
    return;
  }
  const arr = roundsData[rName][sName];
  const idx = arr.indexOf(oldC);
  arr[idx] = newC;

  renameColumn(`${rName}_${sName}_${oldC}`, `${rName}_${sName}_${newC}`);
  renderTable();
  updateDropdowns();
});
btnDelCourse.addEventListener('click', () => {
  const rName = courseRoundSelect.value;
  const sName = courseStadiumSelect.value;
  const cName = courseSelect.value;
  if (!rName || !sName || !roundsData[rName] || !roundsData[rName][sName]) {
    alert('선택 오류.');
    return;
  }
  if (!roundsData[rName][sName].includes(cName)) {
    alert('해당 코스 없음.');
    return;
  }
  if (!confirm(`"${rName} / ${sName} / ${cName}" 삭제?`)) return;
  const arr = roundsData[rName][sName];
  const idx = arr.indexOf(cName);
  arr.splice(idx, 1);
  tableData.forEach(row => {
    delete row[`${rName}_${sName}_${cName}`];
  });
  renderTable();
  updateDropdowns();
});

/*******************************************************************
 * 5. 테이블 렌더링
 *******************************************************************/
function renderTable() {
  recalcSumsAndRanks();

  scoreTable.innerHTML = '';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const allCols = getAllColumns();

  // 헤더
  const trHead = document.createElement('tr');
  allCols.forEach((col) => {
    const th = document.createElement('th');

    if (col === '(삭제)') {
      // 삭제 버튼 칸은 텍스트 표시 X
      th.textContent = '';
    } else {
      th.textContent = col;
      // 정렬
      th.addEventListener('click', () => sortByColumn(col));

      // 라운드별 배경 (헤더만)
      const rn = getRoundNameFromCol(col);
      if (rn) {
        th.classList.add(`round-${rn}`);
      }
      // 구장별 배경 (헤더만, 데이터 셀은 색 없음)
      const sName = getStadiumNameFromCol(col);
      if (sName) {
        th.classList.add(`stadium-${sName}`);
      }

      // 합계 열 => 볼드
      if (isSumColumn(col)) {
        th.classList.add('sum-col');
      }

      // **일차별 최종합계** → 노란색 배경
      //   예: "1일차_합계", "2일차_합계", ...
      if (isDaySumColumn(col)) {
        th.classList.add('day-sum-col'); // CSS: background-color: yellow
      }

      // 최종순위 헤더
      if (col === '최종순위') {
        th.classList.add('final-rank-header');
      }
    }

    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  // 바디
  tableData.forEach((rowObj, rowIndex) => {
    const tr = document.createElement('tr');
    allCols.forEach((col) => {
      if (col === '(삭제)') {
        // 삭제버튼
        const tdDel = document.createElement('td');
        tdDel.innerHTML = `<button class="btn red">삭제</button>`;
        tdDel.addEventListener('click', () => {
          if (!confirm('정말 삭제하시겠습니까?')) return;
          tableData.splice(rowIndex, 1);
          renderTable();
        });
        tr.appendChild(tdDel);
      } else {
        // 일반 데이터 셀
        const td = document.createElement('td');
        td.contentEditable = true;
        const val = rowObj[col] || '';
        td.textContent = val;

        // 입력 시 즉시 반영
        td.addEventListener('input', () => {
          rowObj[col] = td.textContent;
          recalcSumsAndRanks();
        });

        // 합계 열 => 볼드
        if (isSumColumn(col)) {
          td.classList.add('sum-col');
        }
        // 최종순위 데이터 => 빨간색+볼드
        if (col === '최종순위') {
          td.classList.add('final-rank-cell');
        }

        tr.appendChild(td);
      }
    });
    tbody.appendChild(tr);
  });

  scoreTable.appendChild(thead);
  scoreTable.appendChild(tbody);
}

/*******************************************************************
 * 6. 합계/순위 계산
 *******************************************************************/
function recalcSumsAndRanks() {
  tableData.forEach(row => {
    let totalAllDays = 0;

    for (const roundName in roundsData) {
      let daySum = 0;
      const daySumCol = `${roundName}_합계`;

      for (const stName in roundsData[roundName]) {
        let stSum = 0;
        const stSumCol = `${roundName}_${stName}_합계`;
        const courses = roundsData[roundName][stName];
        courses.forEach(cName => {
          const colName = `${roundName}_${stName}_${cName}`;
          const numVal = parseInt(row[colName], 10);
          if (!isNaN(numVal)) stSum += numVal;
        });
        row[stSumCol] = stSum ? String(stSum) : '';
        daySum += stSum;
      }
      row[daySumCol] = daySum ? String(daySum) : '';
      totalAllDays += daySum;
    }

    row['모든일차합계'] = totalAllDays ? String(totalAllDays) : '';
  });

  // 순위
  const sorted = [...tableData].sort((a, b) => {
    const A = parseInt(a['모든일차합계'], 10) || 999999;
    const B = parseInt(b['모든일차합계'], 10) || 999999;
    return A - B;
  });
  sorted.forEach((row, idx) => {
    row['최종순위'] = String(idx + 1);
  });
}

/*******************************************************************
 * 7. 동적 컬럼 파싱
 *******************************************************************/
function parseDynamicColumns(headerCols) {
  roundsData = {};

  const midCols = headerCols.filter(c =>
    c !== '(삭제)' &&
    !fixedLeftCols.includes(c) &&
    !fixedRightCols.includes(c)
  );

  midCols.forEach(col => {
    const parts = col.split('_');
    if (parts.length === 2 && parts[1] === '합계') {
      // "1일차_합계"
      const rName = parts[0];
      if (!roundsData[rName]) {
        roundsData[rName] = {};
      }
    } 
    else if (parts.length === 3 && parts[2] === '합계') {
      // "1일차_1구장_합계"
      const [rName, stName] = parts;
      if (!roundsData[rName]) {
        roundsData[rName] = {};
      }
      if (!roundsData[rName][stName]) {
        roundsData[rName][stName] = [];
      }
    }
    else if (parts.length === 3) {
      // "1일차_1구장_A코스"
      const [rName, sName, cName] = parts;
      if (!roundsData[rName]) {
        roundsData[rName] = {};
      }
      if (!roundsData[rName][sName]) {
        roundsData[rName][sName] = [];
      }
      if (!roundsData[rName][sName].includes(cName)) {
        roundsData[rName][sName].push(cName);
      }
    }
  });
}

/*******************************************************************
 * 8. 컬럼 목록
 *******************************************************************/
function getAllColumns() {
  let cols = [...fixedLeftCols];

  for (const rName in roundsData) {
    for (const sName in roundsData[rName]) {
      roundsData[rName][sName].forEach(cName => {
        cols.push(`${rName}_${sName}_${cName}`);
      });
      cols.push(`${rName}_${sName}_합계`);
    }
    cols.push(`${rName}_합계`);
  }

  cols.push(...fixedRightCols);
  return Array.from(new Set(cols));
}

/*******************************************************************
 * 9. 컬럼명 치환
 *******************************************************************/
function renameColumnPrefix(oldPrefix, newPrefix) {
  tableData.forEach(row => {
    for (const key in row) {
      if (key.startsWith(oldPrefix)) {
        const val = row[key];
        const newKey = key.replace(oldPrefix, newPrefix);
        row[newKey] = val;
        delete row[key];
      }
    }
  });
}
function renameColumn(oldCol, newCol) {
  tableData.forEach(row => {
    if (row.hasOwnProperty(oldCol)) {
      row[newCol] = row[oldCol];
      delete row[oldCol];
    }
  });
}

/*******************************************************************
 * 10. 정렬
 *******************************************************************/
function sortByColumn(col) {
  tableData.sort((a, b) => {
    const A = a[col] || '';
    const B = b[col] || '';
    const AN = parseFloat(A);
    const BN = parseFloat(B);
    if (!isNaN(AN) && !isNaN(BN)) {
      return AN - BN;
    } else {
      return A.localeCompare(B);
    }
  });
  if (!sortState[col]) {
    tableData.reverse();
  }
  sortState[col] = !sortState[col];
  renderTable();
}

/*******************************************************************
 * 11. 라운드명 / 구장명 / 합계 판별
 *******************************************************************/
// 라운드명 추출
function getRoundNameFromCol(col) {
  if (col === '(삭제)') return '';
  if (fixedLeftCols.includes(col)) return '';
  if (fixedRightCols.includes(col)) return '';
  const parts = col.split('_');
  if (parts.length >= 1) {
    return parts[0]; // 예: "1일차"
  }
  return '';
}

// 구장명 추출 (헤더용)
function getStadiumNameFromCol(col) {
  // 예: "1일차_1구장_A코스" => parts[1] = "1구장"
  // "1일차_1구장_합계" => parts[1] = "1구장"
  // "1일차_합계" => parts.length=2 => parts[1]='합계' -> 구장X
  const parts = col.split('_');
  if (parts.length >= 2 && parts[1] !== '합계') {
    return parts[1]; // "1구장", "2구장"...
  }
  return '';
}

// 합계 열?
function isSumColumn(col) {
  if (col.endsWith('_합계')) return true; 
  if (col === '모든일차합계') return true;
  return false;
}

/*******************************************************************
 * 12. “일차별 최종합계”인지 판별
 *     ex) "1일차_합계", "2일차_합계" 등 (parts.length===2 && parts[1]==='합계')
 *******************************************************************/
function isDaySumColumn(col) {
  const parts = col.split('_');
  // 예: ["1일차","합계"] => length=2 & '합계'
  if (parts.length === 2 && parts[1] === '합계') {
    return true;
  }
  return false;
}

/*******************************************************************
 * 13. CSV 파싱
 *******************************************************************/
function parseCSV(csvString) {
  const lines = csvString.trim().split(/\r?\n/);
  return lines.map(line => line.split(','));
}

/*******************************************************************
 * 14. 드롭다운 갱신
 *******************************************************************/
function updateDropdowns() {
  fillSelect(stadiumRoundSelect, Object.keys(roundsData));
  fillSelect(courseRoundSelect,  Object.keys(roundsData));

  const stRound = stadiumRoundSelect.value;
  if (roundsData[stRound]) {
    fillSelect(stadiumSelect, Object.keys(roundsData[stRound]));
  } else {
    fillSelect(stadiumSelect, []);
  }

  const cRound = courseRoundSelect.value;
  if (roundsData[cRound]) {
    fillSelect(courseStadiumSelect, Object.keys(roundsData[cRound]));
  } else {
    fillSelect(courseStadiumSelect, []);
  }

  const st2 = courseStadiumSelect.value;
  if (roundsData[cRound] && roundsData[cRound][st2]) {
    fillSelect(courseSelect, roundsData[cRound][st2]);
  } else {
    fillSelect(courseSelect, []);
  }
}
function fillSelect(selectElem, items) {
  selectElem.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    selectElem.appendChild(opt);
  });
}
