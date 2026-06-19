// js/app.js
let currentViewData = [];
let selectedRows = new Set();

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

// ฟังก์ชันค้นหาข้อมูลแบบออฟไลน์ความเร็วสูงจากโครงสร้างรันไฟล์คู่ของพี่
function searchNetworkData() {
    const targetNetId = document.getElementById('network-input').value.trim();
    if (!targetNetId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');

    const tbody = document.getElementById('result-tbody');
    
    // ตรวจจับไฟล์โมดูลข้อมูลหลักจากฝั่ง Python
    if (typeof window.sapData === 'undefined' || typeof window.weightData === 'undefined') {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">❌ ไม่พบฐานข้อมูลในไฟล์ js/data.js กรุณาเช็กการรันบอทใน GitHub</td></tr>`;
        document.getElementById('result-card').classList.remove('hidden');
        return;
    }

    // กรองรหัสโครงข่ายตรงตัวในมิลลิวินาที
    currentViewData = window.sapData.filter(item => String(item.network).trim() === targetNetId);
    selectedRows.clear();
    renderResultTable();
}

// ประมวลผลและกระจายข้อมูลลงสู่ตารางฟอร์มคำนวณและกล่องการ์ดเปอร์เซ็นต์
function renderResultTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    // Reset Checkbox 'เลือกทั้งหมด' ทุกครั้งที่โหลดตารางใหม่
    const selectAllCb = document.getElementById('select-all-checkbox');
    if (selectAllCb) selectAllCb.checked = false;
    updateDeleteButtonState();

    if (currentViewData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">❌ ไม่พบรายการข้อมูลพัสดุสำหรับรหัสโครงข่ายนี้ในระบบไฟล์ดิบ</td></tr>`;
        updateMetrics(0);
        return;
    }

    currentViewData.forEach((item, index) => {
        const localWeightInfo = window.weightData ? window.weightData[item.materialCode] : null;
        const weightInfo = localWeightInfo || { weight: 0.00, unit: 'กก.' };
        
        // 🟢 แก้ไข: ใช้ตัวแปร reqQty (ปริมาณความต้องการ) ในการคูณน้ำหนัก
        const totalRowWeight = item.reqQty * weightInfo.weight;
        grandTotal += totalRowWeight;

        const isChecked = selectedRows.has(index) ? 'checked' : '';

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">
                    <input type="checkbox" class="row-checkbox" data-index="${index}" onchange="toggleRowSelection(this)" ${isChecked}>
                </td>
                <td style="text-align:center;">${index + 1}</td>
                <td style="color:#555;">${item.wbs}</td>
                <td style="font-weight:600; color:#111;">${item.materialCode}</td>
                <td style="color:#000; font-weight:500;">${item.description}</td>
                <td class="num bold">${item.reqQty.toLocaleString()}</td> <td class="num" style="color:#666;">${weightInfo.weight.toFixed(3)}</td>
                <td style="text-align:center; color:#666;">${weightInfo.unit}</td>
                <td class="num bold" style="color:#0284c7;">${totalRowWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    });

    document.getElementById('grand-total-val').innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    updateMetrics(grandTotal);
    document.getElementById('result-card').classList.remove('hidden');
}

// คำนวณเปอร์เซ็นต์น้ำหนักเป้าหมายและสะท้อนผลขึ้นหน้าจอ
function updateMetrics(totalWeight) {
    const w100 = totalWeight;
    const w90 = totalWeight * 0.9;
    const w80 = totalWeight * 0.8;

    document.getElementById('weight-100').innerText = w100.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('weight-90').innerText = w90.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('weight-80').innerText = w80.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// จัดการการติ๊กเลือก Checkbox รายแถว
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

// จัดการการติ๊กเลือก Checkbox ทั้งหมดในตาราง
function toggleSelectAll(cb) {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (cb.checked) {
        rowCheckboxes.forEach(chk => {
            chk.checked = true;
            selectedRows.add(parseInt(chk.getAttribute('data-index')));
        });
    } else {
        rowCheckboxes.forEach(chk => {
            chk.checked = false;
        });
        selectedRows.clear();
    }
    updateDeleteButtonState();
}

// อัปเดตสถานะปุ่มลบ (เปิด/ปิด ใช้งานและแสดงจำนวน)
function updateDeleteButtonState() {
    const btn = document.getElementById('delete-selected-btn');
    if (!btn) return;
    btn.disabled = selectedRows.size === 0;
    btn.innerText = selectedRows.size > 0
        ? `🗑️ ลบรายการที่เลือก (${selectedRows.size})`
        : '🗑️ ลบรายการที่เลือก';
}

// ลบทุกแถวที่ถูกติ๊กเลือกไว้พร้อมกันในครั้งเดียว หลังยืนยันหนึ่งครั้ง
function deleteSelectedRows() {
    if (selectedRows.size === 0) return;
    if (!confirm(`คุณต้องการลบ ${selectedRows.size} รายการที่เลือกออกจากรายงานนี้ใช่หรือไม่?`)) return;

    currentViewData = currentViewData.filter((_, idx) => !selectedRows.has(idx));
    selectedRows.clear();
    renderResultTable();
}

// โหลดข้อมูลตารางพัสดุและน้ำหนักทั้งหมดมาแสดงในหน้าตารางข้อมูลเพื่อตรวจสอบสิทธิ์
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