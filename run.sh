#!/bin/bash

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "خطأ: Node.js غير مثبت"
    echo "يرجى تشغيل ./install.sh أولاً"
    exit 1
fi

# التحقق من وجود ملف index.js
if [ ! -f index.js ]; then
    echo "خطأ: ملف index.js غير موجود"
    exit 1
fi

# تشغيل الأداة
node index.js "$@"
