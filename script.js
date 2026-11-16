const btn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', e => {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', false); }
  });

  /* ===== تكبير صور المعرض ===== */
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  document.querySelectorAll('.shot').forEach(b => b.addEventListener('click', () => {
    const img = b.querySelector('img');
    if (!img) return;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lb.showModal();
  }));
  document.getElementById('lbClose').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

  /* ===== تسجيل الدخول =====
     الحسابات تُحفظ في متصفح الزائر فقط (localStorage).
     للحسابات الحقيقية المشتركة بين الأجهزة نحتاج خادمًا (مثل Firebase). */
  const mem = {};
  const store = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return k in mem ? mem[k] : d; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ mem[k] = v; } },
    del(k){ try{ localStorage.removeItem(k); }catch(e){ delete mem[k]; } }
  };
  async function hashPass(p){
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lina:' + p));
      return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    }
    return btoa(encodeURIComponent('lina:' + p));
  }

  const authDlg = document.getElementById('authDialog');
  const authMsg = document.getElementById('authMsg');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');

  function say(text, ok){ authMsg.textContent = text || ''; authMsg.classList.toggle('ok', !!ok); }
  function showTab(which){
    const login = which === 'login';
    loginForm.hidden = !login; signupForm.hidden = login;
    tabLogin.setAttribute('aria-selected', login); tabSignup.setAttribute('aria-selected', !login);
    say('');
  }
  function currentUser(){
    const email = store.get('lina_session', null);
    const users = store.get('lina_users', {});
    return email && users[email] ? Object.assign({ email }, users[email]) : null;
  }
  function refreshAuthUI(){
    const u = currentUser();
    document.querySelectorAll('.login').forEach(a => {
      a.textContent = u ? 'مرحبًا ' + u.name.split(' ')[0] : 'تسجيل الدخول';
    });
    document.getElementById('viewAuth').hidden = !!u;
    document.getElementById('viewAccount').hidden = !u;
    if (u) {
      document.getElementById('acName').textContent = u.name;
      document.getElementById('acPhone').textContent = u.phone;
      document.getElementById('acEmail').textContent = u.email;
      const n = document.getElementById('name'), p = document.getElementById('phone');
      if (n && !n.value) n.value = u.name;
      if (p && !p.value) p.value = u.phone;
    }
    renderAccount();
  }

  /* ===== حسابي: البيانات والحجوزات ===== */
  function getBookings(email){ return (store.get('lina_bookings', {})[email]) || []; }
  function addBooking(email, b){
    const all = store.get('lina_bookings', {});
    all[email] = [b].concat(all[email] || []);
    store.set('lina_bookings', all);
  }
  function removeBooking(email, id){
    const all = store.get('lina_bookings', {});
    all[email] = (all[email] || []).filter(x => x.id !== id);
    store.set('lina_bookings', all);
  }
  function el(tag, cls, text){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function renderAccount(){
    const u = currentUser();
    document.getElementById('accOut').hidden = !!u;
    document.getElementById('accIn').hidden = !u;
    if (!u) return;
    document.getElementById('pfName').value = u.name;
    document.getElementById('pfPhone').value = u.phone;
    document.getElementById('pfEmail').value = u.email;
    const list = document.getElementById('bkList');
    list.textContent = '';
    const items = getBookings(u.email);
    document.getElementById('bkEmpty').hidden = items.length > 0;
    items.forEach(b => {
      const li = el('li', 'bk');
      li.appendChild(el('strong', '', b.type + '، ' + b.date));
      li.appendChild(el('span', 'meta', b.time + '، حوالي ' + b.guests + ' شخص'));
      li.appendChild(el('span', 'badge', 'أُرسل عبر واتساب، بانتظار التأكيد'));
      const del = el('button', 'del', 'حذف');
      del.type = 'button';
      let timer;
      del.addEventListener('click', () => {
        if (del.classList.contains('sure')) { removeBooking(u.email, b.id); renderAccount(); return; }
        del.classList.add('sure'); del.textContent = 'تأكيد الحذف';
        timer = setTimeout(() => { del.classList.remove('sure'); del.textContent = 'حذف'; }, 3000);
      });
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  document.getElementById('profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, msg = document.getElementById('pfMsg');
    if (!f.checkValidity()) { f.reportValidity(); msg.textContent = 'عمّر الاسم والهاتف.'; return; }
    const u = currentUser(); if (!u) return;
    const users = store.get('lina_users', {});
    users[u.email].name = document.getElementById('pfName').value.trim();
    users[u.email].phone = document.getElementById('pfPhone').value.trim();
    store.set('lina_users', users);
    refreshAuthUI();
    document.getElementById('pfMsg').textContent = 'تم حفظ التعديلات.';
  });

  document.querySelectorAll('[data-auth]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    nav.classList.remove('open'); btn.setAttribute('aria-expanded', false);
    refreshAuthUI(); showTab('login');
    authDlg.showModal();
  }));
  document.getElementById('authClose').addEventListener('click', () => authDlg.close());
  authDlg.addEventListener('click', e => { if (e.target === authDlg) authDlg.close(); });
  ['acBook','acGo'].forEach(id => document.getElementById(id).addEventListener('click', () => authDlg.close()));
  tabLogin.addEventListener('click', () => showTab('login'));
  tabSignup.addEventListener('click', () => showTab('signup'));

  signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!signupForm.checkValidity()) { signupForm.reportValidity(); say('عمّر كل الخانات بشكل صحيح.'); return; }
    const email = document.getElementById('suEmail').value.trim().toLowerCase();
    const users = store.get('lina_users', {});
    if (users[email]) { say('هذا البريد مسجّل من قبل. جرّب تسجيل الدخول.'); return; }
    users[email] = {
      name: document.getElementById('suName').value.trim(),
      phone: document.getElementById('suPhone').value.trim(),
      hash: await hashPass(document.getElementById('suPass').value)
    };
    store.set('lina_users', users);
    store.set('lina_session', email);
    signupForm.reset(); refreshAuthUI();
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('liEmail').value.trim().toLowerCase();
    const users = store.get('lina_users', {});
    const h = await hashPass(document.getElementById('liPass').value);
    if (!users[email] || users[email].hash !== h) { say('البريد أو كلمة السر غير صحيحة.'); return; }
    store.set('lina_session', email);
    loginForm.reset(); refreshAuthUI();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    store.del('lina_session'); refreshAuthUI(); showTab('login'); say('تم تسجيل الخروج.', true);
  });
  refreshAuthUI();

  /* ===== الحجز عبر واتساب =====
     بدّل الرقم بالرقم الحقيقي للقاعة، بصيغة دولية بدون + ولا 00
     مثال: 0555123456 يصبح 213555123456 */
  const WA_NUMBER = "213555166137";

  document.getElementById('waFloat').href =
    "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent("السلام عليكم، حبيت نستفسر على قاعة لينا.");

  document.getElementById('waFooter').href = document.getElementById('waFloat').href;

  const form = document.getElementById('bookingForm');
  const status = document.getElementById('status');
  const dateInput = document.getElementById('date');
  dateInput.min = new Date().toISOString().split('T')[0];

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = "عمّر الخانات المطلوبة من فضلك.";
      return;
    }
    const d = Object.fromEntries(new FormData(form));
    const msg =
`السلام عليكم، حبيت نحجز في قاعة لينا:
الاسم: ${d.name}
الهاتف: ${d.phone}
المناسبة: ${d.type}
التاريخ: ${d.date}
الفترة: ${d.time}
عدد المدعوين: ${d.guests}
${d.notes ? "ملاحظات: " + d.notes : ""}`.trim();

    window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
    const user = currentUser();
    if (user) {
      addBooking(user.email, {
        id: Date.now().toString(36), name: d.name, phone: d.phone, type: d.type,
        date: d.date, time: d.time, guests: d.guests, notes: d.notes || '', createdAt: Date.now()
      });
      renderAccount();
      status.textContent = "تم فتح واتساب وسجّلنا الطلب في حسابي. اضغط إرسال باش توصلنا الرسالة.";
    } else {
      status.textContent = "تم فتح واتساب. اضغط إرسال باش توصلنا الرسالة. سجّل الدخول باش تتابع طلباتك في حسابي.";
    }
  });
