// js/app.js
let currentViewData = [];
let selectedRows = new Set();

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

// ค้นหาและกรองข้อมูลโครงข่าย
function searchNetworkData() {
    const targetNetId = document.getElementById('network-input').value.trim();
    if (!targetNetId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');

    const tbody = document.getElementById('result-tbody');
    
    if (typeof window.sapData === 'undefined' || typeof window.weightData === 'undefined') {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">❌ ไม่พบฐานข้อมูล กรุณากด Ctrl+F5 เพื่อล้างแคช</td></tr>`;
        document.getElementById('result-card').classList.remove('hidden');
        return;
    }

    const cleanTarget = targetNetId.replace(/\.0$/, '');
    currentViewData = window.sapData.filter(item => {
        const net = String(item.network).trim().replace(/\.0$/, '');
        return net === cleanTarget;
    });
    
    selectedRows.clear();
    document.getElementById('actualWeight').value = '';
    document.getElementById('resultBox').innerHTML = '';
    renderResultTable();
}

function renderResultTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    const selectAllCb = document.getElementById('select-all-checkbox');
    if (selectAllCb) selectAllCb.checked = false;
    updateDeleteButtonState();

    if (currentViewData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">❌ ไม่พบรายการข้อมูลพัสดุสำหรับรหัสโครงข่ายนี้ในระบบไฟล์ดิบ</td></tr>`;
        updateMetrics(0);
        document.getElementById('header-wbs-network').innerText = '-';
        return;
    }

    // 🟢 รวม WBS และ โครงข่าย เพื่อนำไปแสดงผลบรรทัดเดียวกันใน Header
    const uniqueWBS = [...new Set(currentViewData.map(i => i.wbs))].join(', ');
    const networkVal = currentViewData[0].network;
    document.getElementById('header-wbs-network').innerText = `${uniqueWBS} / ${networkVal}`;

    currentViewData.forEach((item, index) => {
        const localWeightInfo = window.weightData ? window.weightData[item.materialCode] : null;
        const weightInfo = localWeightInfo || { weight: 0.00, unit: 'กก.' };
        
        // ใช้ปริมาณความต้องการ (reqQty) ในการคำนวณ
        const qty = item.reqQty !== undefined ? item.reqQty : (item.diffQty || 0);
        const totalRowWeight = qty * weightInfo.weight;
        grandTotal += totalRowWeight;

        const isChecked = selectedRows.has(index) ? 'checked' : '';

        // 🟢 ซ่อนคอลัมน์ WBS จากตาราง เพื่อให้เหมือนฟอร์มตัวอย่าง
        tbody.innerHTML += `
            <tr>
                <td class="no-print" style="text-align:center;">
                    <input type="checkbox" class="row-checkbox" data-index="${index}" onchange="toggleRowSelection(this)" ${isChecked}>
                </td>
                <td style="text-align:center;">${index + 1}</td>
                <td style="font-weight:600; color:#111;">${item.materialCode}</td>
                <td style="color:#000; font-weight:500;">${item.description}</td>
                <td class="num bold">${qty.toLocaleString()}</td>
                <td class="num" style="color:#666;">${weightInfo.weight.toFixed(3)}</td>
                <td class="num bold" style="color:#0b5ed7;">${totalRowWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="text-align:center; color:#666;">${weightInfo.unit}</td>
                <td class="no-print action-col" style="text-align:center;">
                    <button onclick="removeItem(${index})" class="btn-delete-sm">ลบ</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('grand-total-val').innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    updateMetrics(grandTotal);
    document.getElementById('result-card').classList.remove('hidden');
}

// คำนวณเปอร์เซ็นต์น้ำหนักเป้าหมายลงใน Stat Box
function updateMetrics(totalWeight) {
    const w100 = totalWeight;
    const w90 = totalWeight * 0.9;
    const w80 = totalWeight * 0.8;

    document.getElementById('weight-100').innerText = w100.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('weight-90').innerText = w90.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('weight-80').innerText = w80.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// 🟢 ฟังก์ชันสำหรับตรวจสอบน้ำหนักจริงเทียบกับเกณฑ์ 90% และ 80%
function runCheck() {
    const actual = parseFloat(document.getElementById('actualWeight').value);
    const box = document.getElementById('resultBox');
    if (isNaN(actual)) { box.innerHTML = ''; return; }

    const w100Str = document.getElementById('weight-100').innerText.replace(/,/g, '');
    const w100 = parseFloat(w100Str);
    const w90 = w100 * 0.9;
    const w80 = w100 * 0.8;

    let status = '', cls = '', note = '';

    if (actual >= w90) {
        status = 'ผ่านเกณฑ์'; cls = 'good'; note = 'น้ำหนักอยู่ในเกณฑ์มาตรฐาน (≥ 90%)';
    } else if (actual >= w80) {
        status = 'ต่ำกว่าเกณฑ์เฉลี่ย'; cls = 'warn'; note = 'น้ำหนักน้อยกว่าค่าเฉลี่ย (90%) แต่ไม่ต่ำกว่าค่าเบี่ยงเบน (80%)';
    } else {
        status = 'ต่ำกว่าค่าเบี่ยงเบน'; cls = 'bad'; note = 'น้ำหนักต่ำกว่าค่าเบี่ยงเบน (80%)';
    }

    box.innerHTML = `<div class="status-box ${cls}"><b>สถานะ:</b> ${status}<br><small>${note}</small></div>`;
}

// -- ฟังก์ชัน Checkbox และการลบ (คงเดิม 100%) --
function toggleRowSelection(cb) {
    const index = parseInt(cb.getAttribute('data-index'));
    if (cb.checked) {
        selectedRows.add(index);
    } else {
        selectedRows.delete(index);
        const selectAllCb = document.getElementById('select-all-checkbox');
        if (selectAllCb) selectAllCb.checked = false;
    }
    updateDeleteButtonState();
}

function toggleSelectAll(cb) {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (cb.checked) {
        rowCheckboxes.forEach(chk => { chk.checked = true; selectedRows.add(parseInt(chk.getAttribute('data-index'))); });
    } else {
        rowCheckboxes.forEach(chk => { chk.checked = false; });
        selectedRows.clear();
    }
    updateDeleteButtonState();
}

function updateDeleteButtonState() {
    const btn = document.getElementById('delete-selected-btn');
    if (!btn) return;
    btn.disabled = selectedRows.size === 0;
    btn.innerText = selectedRows.size > 0 ? `🗑️ ลบรายการที่เลือก (${selectedRows.size})` : '🗑️ ลบรายการที่เลือก';
}

function deleteSelectedRows() {
    if (selectedRows.size === 0) return;
    if (!confirm(`คุณต้องการลบ ${selectedRows.size} รายการที่เลือกออกจากรายงานนี้ใช่หรือไม่?`)) return;
    currentViewData = currentViewData.filter((_, idx) => !selectedRows.has(idx));
    selectedRows.clear();
    renderResultTable();
    document.getElementById('resultBox').innerHTML = ''; // เคลียร์สถานะน้ำหนักเดิม
}

function removeItem(idx) {
    if(confirm('คุณต้องการลบพัสดุรายการนี้ออกจากการพิมพ์หน้ารายงานปัจจุบันใช่หรือไม่?')) {
        currentViewData.splice(idx, 1);
        renderResultTable();
        document.getElementById('resultBox').innerHTML = '';
    }
}

function loadWeightTable() {
    const tbody = document.getElementById('weight-list-tbody');
    if (typeof window.weightData === 'undefined') {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">❌ ไม่พบข้อมูลพัสดุในไฟล์ระบบ</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    for (const code in window.weightData) {
        const w = window.weightData[code];
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:600;">${code}</td>
                <td>${w.description}</td>
                <td class="num bold" style="color:#16a34a;">${w.weight.toFixed(3)}</td>
                <td style="text-align:center; color:#666;">${w.unit}</td>
            </tr>
        `;
    }
}