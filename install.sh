#!/bin/bash

echo "=========================================="
echo "  Test Hack Elite v5.0 - Linux Installer"
echo "=========================================="
echo ""

# التحقق من تثبيت Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js غير مثبت. جاري التثبيت..."

    # التحقق من نوع النظام
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        sudo apt update
        sudo apt install -y nodejs npm
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS
        sudo yum install -y nodejs npm
    elif [ -f /etc/arch-release ]; then
        # Arch Linux
        sudo pacman -S nodejs npm
    else
        echo "النظام غير مدعوم تلقائياً. يرجى تثبيت Node.js يدوياً."
        exit 1
    fi
else
    echo "✓ Node.js مثبت: $(node --version)"
fi

# التحقق من تثبيت npm
if ! command -v npm &> /dev/null; then
    echo "npm غير مثبت. جاري التثبيت..."
    sudo apt install -y npm
else
    echo "✓ npm مثبت: $(npm --version)"
fi

# تثبيت الحزم المطلوبة
echo ""
echo "جاري تثبيت الحزم المطلوبة..."
npm install

# إنشاء ملفات التكوين
echo ""
echo "جاري إنشاء ملفات التكوين..."

# إنشاء ملف proxies.txt
if [ ! -f proxies.txt ]; then
    cat > proxies.txt << EOF
# أضف البروكسي هنا بالصيغة: ip:port
# مثال:
# 127.0.0.1:8080
# 192.168.1.1:3128
EOF
    echo "✓ تم إنشاء proxies.txt"
fi

# إنشاء ملف wordlist.txt
if [ ! -f wordlist.txt ]; then
    cat > wordlist.txt << EOF
password123
admin123
qwerty
123456
password
12345678
abc123
Password1
admin
welcome
EOF
    echo "✓ تم إنشاء wordlist.txt"
fi

# جعل الملفات قابلة للتنفيذ
chmod +x install.sh
chmod +x run.sh

echo ""
echo "=========================================="
echo "  تم التثبيت بنجاح!"
echo "=========================================="
echo ""
echo "للتشغيل، استخدم الأمر:"
echo "  ./run.sh [الأمر]"
echo ""
echo "أو:"
echo "  node index.js [الأمر]"
echo ""
echo "للمزيد من المعلومات، راجع README.md"
echo ""
