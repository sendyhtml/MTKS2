
    // ========== LOGIKA UTAMA (TETAP SAMA 100%) ==========
    
    // Konfigurasi & State
    let currentSoal = '', currentHasil = '';
    let poolSoal = [], indexSoal = 0, skor = 0;
    let calculationHistory = JSON.parse(localStorage.getItem('mathAppHistory')) || [];

    // MathJS Config
    math.config({
        number: 'BigNumber',
        precision: 64
    });

    // Navigasi UI
    function showSection(sectionId) {
        document.querySelectorAll('.card').forEach(card => {
            card.classList.add('hidden');
        });
        
        document.getElementById(sectionId).classList.remove('hidden');
        
        // Update Nav Active State
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        
        // Simple Logic to highlight correct nav button
        const navMap = {
            'mainMenu': 0, 'calculator': 1, 'quiz': 2, 'history': 3, 'customSoal': 0 // Tools back to home tab visually
        };
        
        const navItems = document.querySelectorAll('.nav-item');
        if (navMap[sectionId] !== undefined) {
            navItems[navMap[sectionId]].classList.add('active');
        }

        window.scrollTo(0, 0);
        if(sectionId === 'history') displayHistory();
    }

    function showHistory() {
        showSection('history');
    }

    function displayHistory() {
        const historyList = document.getElementById('historyList');
        if (calculationHistory.length === 0) {
            historyList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada riwayat</div>';
            return;
        }
        
        historyList.innerHTML = calculationHistory.slice(-20).reverse().map(item => `
            <div class="history-item">
                <div style="font-family: monospace; color: #fff;">${item.expression}</div>
                <div style="color: var(--success); font-weight: bold; font-size: 1.1rem;">= ${item.result}</div>
                <small style="color: var(--text-muted); font-size: 0.7rem;">${item.timestamp}</small>
            </div>
        `).join('');
    }

    function addToHistory(expression, result) {
        const historyItem = {
            expression: expression,
            result: result,
            timestamp: new Date().toLocaleString('id-ID')
        };
        calculationHistory.push(historyItem);
        if (calculationHistory.length > 50) calculationHistory = calculationHistory.slice(-50);
        localStorage.setItem('mathAppHistory', JSON.stringify(calculationHistory));
    }

    function clearHistory() {
        calculationHistory = [];
        localStorage.setItem('mathAppHistory', JSON.stringify(calculationHistory));
        displayHistory();
    }

    // Kalkulator Helper
    function appendToInput(value) {
        const input = document.getElementById('inputSoal');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + value + input.value.substring(end);
        input.focus();
        input.setSelectionRange(start + value.length, start + value.length);
    }

    function clearInput() {
        document.getElementById('inputSoal').value = '';
        document.getElementById('outputHasil').textContent = '';
    }

    function backspace() {
        const input = document.getElementById('inputSoal');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (start === end && start > 0) {
            input.value = input.value.substring(0, start - 1) + input.value.substring(end);
            input.setSelectionRange(start - 1, start - 1);
        } else {
            input.value = input.value.substring(0, start) + input.value.substring(end);
            input.setSelectionRange(start, start);
        }
        input.focus();
    }

    function showLoading(section, show) {
        const loadingElement = document.getElementById(`loading${section.charAt(0).toUpperCase() + section.slice(1)}`);
        if (loadingElement) loadingElement.classList.toggle('hidden', !show);
    }

    // Engine Evaluasi
    function evaluasiEkspresi(ekspresi) {
        try {
            let normalizedExpr = ekspresi
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/π/g, 'pi')
                .replace(/√(\d+)/g, 'sqrt($1)')
                .replace(/√\(([^)]+)\)/g, 'sqrt($1)')
                .replace(/(\d+)%/g, '($1/100)')
                .replace(/(\d+)% dari (\d+)/g, '($1/100)*$2')
                .replace(/(\d+)\s*mod\s*(\d+)/gi, 'mod($1, $2)')
                .replace(/\^/g, '^');
            
            if (normalizedExpr.includes('=')) return selesaikanPersamaanSederhana(normalizedExpr);
            
            const result = math.evaluate(normalizedExpr);
            
            if (math.typeOf(result) === 'BigNumber') return result.toString();
            else if (typeof result === 'number') {
                if (Number.isInteger(result)) return result.toString();
                else return parseFloat(result.toFixed(10)).toString();
            } else return result.toString();
            
        } catch (error) {
            throw new Error(`Syntax Error`);
        }
    }

    function selesaikanPersamaanSederhana(ekspresi) {
        try {
            const sides = ekspresi.split('=');
            if (sides.length !== 2) throw new Error('Format persamaan tidak valid');
            
            const left = sides[0].trim();
            const right = sides[1].trim();
            
            if (left.includes('x')) {
                const match = left.match(/([-+]?\d*)x\s*([-+]\s*\d+)?/);
                if (match) {
                    const a = match[1] === '' || match[1] === '+' ? 1 : 
                             match[1] === '-' ? -1 : parseInt(match[1]);
                    const b = match[2] ? math.evaluate(match[2].replace(/\s/g, '')) : 0;
                    const c = math.evaluate(right);
                    const x = (c - b) / a;
                    return `x = ${x}`;
                }
            }
            throw new Error('Format persamaan tidak dikenali');
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }

    // Eksekusi Kalkulator
    async function hitungSoal() {
        const input = document.getElementById('inputSoal').value.trim();
        const output = document.getElementById('outputHasil');
        
        if (!input) {
            output.innerHTML = '<span style="color:#ef4444">Input kosong</span>';
            return;
        }
        
        showLoading('calculator', true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const hasil = evaluasiEkspresi(input);
            output.innerHTML = `<span class="output-result">${hasil}</span>`;
            addToHistory(input, hasil);
        } catch (err) {
            output.innerHTML = `<span style="color:#ef4444">❌ ${err.message}</span>`;
        }
        showLoading('calculator', false);
    }

    // Quiz System
    function updateQuizOptions() {
        const level = document.getElementById('tingkatPendidikan').value;
        const jenisSoalSelect = document.getElementById('jenisSoal');
        const advancedOptions = ['^', '√'];
        for (let option of jenisSoalSelect.options) {
            if (advancedOptions.includes(option.value)) {
                option.disabled = level === 'tk' || level === 'sd';
            }
        }
    }

    function mulaiQuiz() {
        const level = document.getElementById('tingkatPendidikan').value;
        const jenis = document.getElementById('jenisSoal').value;
        skor = 0; poolSoal = []; indexSoal = 0;
        
        for (let i = 0; i < 10; i++) poolSoal.push(generateQuizSoal(level, jenis));
        
        tampilkanSoal(indexSoal);
        document.getElementById('quizScore').textContent = `SCORE: ${skor}`;
        document.getElementById('quizFeedback').textContent = '';
    }

    function generateQuizSoal(level, jenis) {
        const ranges = {
            'tk': [1, 10], 'sd': [1, 100], 'smp': [1, 1000],
            'sma': [1, 10000], 'mahasiswa': [1, 100000]
        };
        const [min, max] = ranges[level] || [1, 100];
        let a = Math.floor(Math.random() * (max - min + 1)) + min;
        let b = Math.floor(Math.random() * (max - min + 1)) + min;
        
        if (jenis === 'acak') {
            const types = ['+', '-', '*', '/'];
            if (level !== 'tk' && level !== 'sd') types.push('^', '√');
            jenis = types[Math.floor(Math.random() * types.length)];
        }
        
        let soal = '', hasil = '';
        switch(jenis) {
            case '+': soal = `${a} + ${b}`; hasil = (a + b).toString(); break;
            case '-': 
                if (level === 'tk' || level === 'sd') [a, b] = [Math.max(a, b), Math.min(a, b)];
                soal = `${a} - ${b}`; hasil = (a - b).toString(); break;
            case '*': 
                if (level === 'tk' || level === 'sd') { a = Math.min(a, 10); b = Math.min(b, 10); }
                soal = `${a} × ${b}`; hasil = (a * b).toString(); break;
            case '/': 
                b = Math.max(b, 1); a = a * b; 
                soal = `${a} ÷ ${b}`; hasil = (a / b).toString(); break;
            case '^': 
                const pangkat = level === 'tk' || level === 'sd' ? 2 : Math.floor(Math.random() * 3) + 2;
                soal = `${a}²`; hasil = (a * a).toString(); break;
            case '√': 
                const akar = Math.floor(Math.random() * 12) + 1;
                soal = `√${akar * akar}`; hasil = akar.toString(); break;
        }
        return { soal, hasil };
    }

    function tampilkanSoal(idx) {
        if (idx >= poolSoal.length) {
            document.getElementById('quizSoal').innerHTML = "🎉 <strong>Selesai!</strong>";
            document.getElementById('jawabanQuiz').value = "";
            document.getElementById('btnNextSoal').style.display = 'none';
            document.getElementById('quizFeedback').innerHTML = `<span style="color:var(--success)">Skor Akhir: ${skor}/${poolSoal.length}</span>`;
            return;
        }
        const current = poolSoal[idx];
        currentSoal = current.soal;
        currentHasil = current.hasil;
        document.getElementById('quizSoal').innerHTML = `<strong>Q${idx + 1}:</strong>&nbsp; ${currentSoal}`;
        document.getElementById('jawabanQuiz').value = '';
        document.getElementById('quizFeedback').textContent = '';
        document.getElementById('btnNextSoal').style.display = 'none';
    }

    function cekJawaban() {
        const jawabanUser = document.getElementById('jawabanQuiz').value.trim();
        const feedback = document.getElementById('quizFeedback');
        
        if (!jawabanUser) {
            feedback.innerHTML = '<span style="color:#ef4444">Isi jawaban dulu!</span>';
            return;
        }
        
        try {
            const userAnswer = parseFloat(jawabanUser);
            const correctAnswer = parseFloat(currentHasil);
            const isCorrect = !isNaN(userAnswer) && !isNaN(correctAnswer) ? 
                Math.abs(userAnswer - correctAnswer) < 0.0001 : 
                jawabanUser.toLowerCase() === currentHasil.toLowerCase();
                
            if (isCorrect) {
                feedback.innerHTML = '<span style="color:#10b981; font-weight:bold;">✅ BENAR!</span>';
                skor++;
            } else {
                feedback.innerHTML = `<span style="color:#ef4444">❌ Salah. Jawabannya: ${currentHasil}</span>`;
            }
            document.getElementById('quizScore').textContent = `SCORE: ${skor}`;
            document.getElementById('btnNextSoal').style.display = 'block';
        } catch {
            feedback.innerHTML = '<span style="color:#ef4444">Format salah</span>';
        }
    }

    function nextSoal() {
        indexSoal++;
        tampilkanSoal(indexSoal);
    }

    // Custom Soal & OCR
    async function hitungCustomSoal() {
        const soal = document.getElementById('soalUser').value.trim();
        const output = document.getElementById('outputCustomSoal');
        if (!soal) { output.innerHTML = '<span style="color:#ef4444">Input kosong</span>'; return; }
        
        try {
            const hasil = evaluasiEkspresi(soal);
            output.innerHTML = `<span class="output-result">Result: ${hasil}</span>`;
            addToHistory(soal, hasil);
        } catch (err) {
            output.innerHTML = `<span style="color:#ef4444">❌ ${err.message}</span>`;
        }
    }

    async function kirimFotoSoal() {
        const fileInput = document.getElementById('fotoSoal');
        const preview = document.getElementById('previewFoto');
        if (fileInput.files.length === 0) { preview.innerHTML = '<span style="color:#ef4444">Pilih gambar!</span>'; return; }
        
        const file = fileInput.files[0];
        const imgURL = URL.createObjectURL(file);
        preview.innerHTML = `<img src="${imgURL}" style="max-width:100%; border-radius:10px; margin-bottom:10px;">`;
        preview.innerHTML += '<div class="loading">🔍 Scanning AI...</div>';
        
        try {
            const { data: { text } } = await Tesseract.recognize(file, 'eng');
            let cleanedText = text
                .replace(/[Oo]/g, '0')
                .replace(/[lI]/g, '1')
                .replace(/[^0-9+\-*/.()√π=%\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            preview.querySelector('.loading').remove();
            
            preview.innerHTML += `<div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin-bottom:5px;">Detected: <strong>${cleanedText}</strong></div>`;
            
            if (cleanedText) {
                const hasil = evaluasiEkspresi(cleanedText);
                preview.innerHTML += `<div class="output-result" style="font-size:1.2rem;">= ${hasil}</div>`;
                addToHistory(cleanedText, hasil);
            } else {
                preview.innerHTML += '<div style="color:#ef4444">Teks tidak terbaca</div>';
            }
        } catch(err) {
            preview.innerHTML += `<div style="color:#ef4444">Error: ${err.message}</div>`;
        }
    }

    // Init
    document.addEventListener('DOMContentLoaded', function() {
        displayHistory();
        window.mod = function(a, b) { return a % b; };
        
        // Spinning animation for loading
        const style = document.createElement('style');
        style.innerHTML = `@keyframes spin { 100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } }`;
        document.head.appendChild(style);
    });
   