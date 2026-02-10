# دليل التثبيت والاستخدام على Linux

## 📋 المتطلبات

- نظام Linux (Ubuntu, Debian, CentOS, Arch, أو أي توزيعة أخرى)
- اتصال بالإنترنت
- صلاحيات sudo (للتثبيت)

---

## 🚀 خطوات التثبيت

### الطريقة الأولى: استخدام السكربت التلقائي (موصى به)

1. **نقل الملفات إلى Linux**
   ```bash
   # باستخدام SCP
   scp -r /path/to/folder user@linux-server:/home/user/

   # أو باستخدام SFTP
   # أو بنسخ الملفات يدوياً
   ```

2. **تثبيت الأداة**
   ```bash
   cd /path/to/folder
   chmod +x install.sh
   ./install.sh
   ```

3. **التحقق من التثبيت**
   ```bash
   node --version
   npm --version
   ```

### الطريقة الثانية: التثبيت اليدوي

1. **تثبيت Node.js**

   على Ubuntu/Debian:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm
   ```

   على CentOS/RHEL:
   ```bash
   sudo yum install -y nodejs npm
   ```

   على Arch Linux:
   ```bash
   sudo pacman -S nodejs npm
   ```

2. **تثبيت الحزم**
   ```bash
   cd /path/to/folder
   npm install
   ```

3. **جعل السكربتات قابلة للتنفيذ**
   ```bash
   chmod +x run.sh
   ```

---

## 📖 طرق الاستخدام

### الطريقة الأولى: استخدام run.sh (موصى به)

```bash
./run.sh adminfinder http://localhost:3000
./run.sh sqli "http://localhost:3000/products?id=1"
./run.sh xss "http://localhost:3000/search?q=test"
```

### الطريقة الثانية: استخدام npm scripts

```bash
npm start adminfinder http://localhost:3000
npm run sqli "http://localhost:3000/products?id=1"
npm run xss "http://localhost:3000/search?q=test"
```

### الطريقة الثالثة: استخدام node مباشرة

```bash
node index.js adminfinder http://localhost:3000
node index.js sqli "http://localhost:3000/products?id=1"
node index.js xss "http://localhost:3000/search?q=test"
```

---

## 🔧 إعدادات إضافية

### 1. إعداد ملف proxies.txt

```bash
nano proxies.txt
```

أضف البروكسي بالصيغة:
```
ip:port
```

مثال:
```
127.0.0.1:8080
192.168.1.1:3128
```

### 2. إعداد ملف wordlist.txt

```bash
nano wordlist.txt
```

أضف كلمات المرور، كلمة في كل سطر:
```
password123
admin123
qwerty
```

---

## 🐛 حل المشاكل الشائعة

### مشكلة: "Permission denied"

**الحل:**
```bash
chmod +x install.sh
chmod +x run.sh
```

### مشكلة: "Node.js not found"

**الحل:**
```bash
# على Ubuntu/Debian
sudo apt install -y nodejs npm

# على CentOS/RHEL
sudo yum install -y nodejs npm

# على Arch Linux
sudo pacman -S nodejs npm
```

### مشكلة: "npm command not found"

**الحل:**
```bash
# على Ubuntu/Debian
sudo apt install -y npm

# على CentOS/RHEL
sudo yum install -y npm

# على Arch Linux
sudo pacman -S npm
```

### مشكلة: "Cannot find module"

**الحل:**
```bash
npm install
```

---

## 📝 أمثلة عملية

### اختبار تطبيق ويب محلي

```bash
# 1. فحص لوحات الإدارة
./run.sh adminfinder http://localhost:3000

# 2. فحص SQL Injection
./run.sh sqli "http://localhost:3000/products?id=1"

# 3. فحص XSS
./run.sh xss "http://localhost:3000/search?q=test"

# 4. اختبار تسجيل الدخول
./run.sh bruteforce "http://localhost:3000/login" "admin"
```

### اختبار API

```bash
# 1. فحص IDOR
./run.sh privesc-idor "http://localhost:3000" "/api/users/{id}" 1 100

# 2. اختبار JWT
./run.sh privesc-jwt "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔒 ممارسات الاستخدام الآمن على Linux

### 1. استخدام مستخدم عادي
```bash
# لا تستخدم root للتشغيل
# استخدم مستخدم عادي بدلاً من ذلك
```

### 2. استخدام VPN
```bash
# تثبيت OpenVPN
sudo apt install -y openvpn

# تشغيل VPN
sudo openvpn --config config.ovpn
```

### 3. استخدام Proxychains
```bash
# تثبيت proxychains
sudo apt install -y proxychains

# الاستخدام
proxychains ./run.sh adminfinder http://localhost:3000
```

---

## 📚 موارد إضافية

### تعلم Linux
- Linux Journey: https://linuxjourney.com/
- Linux Command Line: https://linuxcommand.org/

### تعلم Node.js على Linux
- Node.js Documentation: https://nodejs.org/docs/
- NPM Documentation: https://docs.npmjs.com/

---

## ⚠️ ملاحظات مهمة

1. **الصلاحيات:**
   - استخدم sudo فقط للتثبيت
   - لا تشغل الأداة بصلاحيات root

2. **الأمان:**
   - استخدم VPN عند الاختبار
   - استخدم proxychains للتخفي
   - احمِ ملفات التكوين

3. **التحديثات:**
   - حدّث Node.js بانتظام
   - حدّث الحزم باستخدام npm update

---

## 📞 الدعم

للحصول على المساعدة:
- راجع README.md الرئيسي
- راجع التوثيق الرسمي
- شارك في المجتمعات الأمنية

---

**تم تطوير هذا الدليل للاستخدام على Linux**
