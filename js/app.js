// ใส่ URL ของคุณให้แล้วครับ
const API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec";
let currentData = [];

async function fetchNetworkData() {
    const networkId = document.getElementById('network-input').value.trim();
    if (!networkId) return alert('กรุณาระบุรหัส');
    
    document.getElementById('result-card').classList.add('hidden');
    try {
        const response = await fetch(`${API_URL}?action=get_network_data&networkId=${networkId}`);
        const res = await response.json();
        if (res.status === 'success') {
            currentData = res.data;
            renderTable();
        } else alert('Error: ' + res.message);
    } catch (err) { alert('เชื่อมต่อ API ไม่ได้'); }
}

function renderTable() {
    const tbody = document.getElementById('materials-tbody');
    tbody.innerHTML = '';
    let total = 0;

    currentData.forEach((item, index) => {
        total += item.totalWeight;
        tbody.innerHTML += `
            <tr>
                <td>${item.wbs}</td><td>${item.materialCode}</td><td>${item.description}</td>
                <td>${item.diffQty}</td><td>${item.unitWeight}</td><td>${item.unit}</td>
                <td>${item.totalWeight.toFixed(2)}</td>
                <td class="action-col"><button onclick="removeItem(${index})" style="background:red">ลบ</button></td>
            </tr>
        `;
    });
    document.getElementById('grand-total-weight').innerText = total.toFixed(2);
    document.getElementById('result-card').classList.remove('hidden');
}

function removeItem(index) {
    currentData.splice(index, 1);
    renderTable();
}