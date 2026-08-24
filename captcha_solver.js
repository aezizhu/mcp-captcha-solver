// ==UserScript==
// @name         Auto Identify & Fill Captcha
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Automatically identify and fill digital/English captchas for most websites
// @author       aezi
// @license      GPL Licence
// @connect      ca.zwhyzzz.top
// @connect      www.jfbym.com
// @connect      self
// @match        http://*/*
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    var element, input, imgIndex, canvasIndex, inputIndex, captchaType;
    var localRules = [];
    var queryUrl = "https://ca.zwhyzzz.top:8092/"
    // Remote solving sends the current page's origin/path and captcha images to the
    // solver service above. It is disabled until the user explicitly opts in.
    var remoteSolverEnabled = GM_getValue("remoteSolverEnabled", false);
    var exist = false;
    var iscors = false;
    var inBlack = false;
    var firstin = true;

    var fisrtUse = GM_getValue("fisrtUse", true);
    if (fisrtUse) {
        var mzsm = prompt("Auto Identify & Fill Captcha\nFirst time use, please read and agree to the following disclaimer.\n\n \
1. This script is for learning and research purposes only. You must completely delete all content from your computer, phone, or any storage device within 24 hours after downloading. I am not responsible for any incidents caused by violating this rule.\n \
2. Do not use this script for any commercial or illegal purposes. You are solely responsible for any violations.\n \
3. I am not responsible for any issues caused by this script, including but not limited to any loss or damage caused by script errors.\n \
4. Anyone who views or uses this script in any way, directly or indirectly, should read these terms carefully.\n \
5. I reserve the right to change or supplement these terms at any time. Once you use or copy this script, you are deemed to have accepted this disclaimer.\n\n \
If you agree to the above, please enter 'I have read and agree to the above content' and then start using.", "");
        if (mzsm == "I have read and agree to the above content") {
            GM_setValue("fisrtUse", false);
        }
        else {
            alert("Disclaimer not agreed, script stopped.\nIf you do not want to use it, please disable the script yourself to avoid this prompt on every page.");
            return;
        }
    }

    GM_registerMenuCommand('Add Current Page Rule', addRule);
    GM_registerMenuCommand('Delete Current Page Rule', delRule);
    GM_registerMenuCommand('Manage All Rules', manageRules);
    GM_registerMenuCommand('Manage Blacklist', manageBlackList);
    GM_registerMenuCommand('Cloud Code Config (Math)', ymConfig);
    GM_registerMenuCommand('Delay Identification Time', setStartDelay);
    GM_registerMenuCommand('Self-service IP Unban', unbanIP);
    GM_registerMenuCommand('Join Group', getQQGroup);
    GM_registerMenuCommand((remoteSolverEnabled ? 'Disable' : 'Enable') + ' Remote Solver', toggleRemoteSolver);

    function toggleRemoteSolver() {
        if (!remoteSolverEnabled) {
            var ok = confirm("Enable the remote solver?\nWhen enabled, the current page's address and captcha images are sent to " + queryUrl + " for recognition.");
            if (!ok) return;
        }
        GM_setValue("remoteSolverEnabled", !remoteSolverEnabled);
        topNotice("Remote solver " + (!remoteSolverEnabled ? "enabled" : "disabled") + ", refresh page to take effect");
    }

    function sanitizeAnswer(ans) {
        // Solver responses are untrusted: keep only plain captcha characters and bound the length
        return String(ans).replace(/\s+/g, "").replace(/[^0-9a-zA-Z+\-*/=.]/g, "").slice(0, 64);
    }

    GM_setValue("preCode", "");
    GM_getValue("ymConfig", null) == null ? GM_setValue("ymConfig", "50106") : null;

    function getQQGroup() {
        GM_xmlhttpRequest({
            method: "GET",
            url: queryUrl + "getQQGroup",
            onload: function (response) {
                try {
                    var qqGroup = response.responseText;
                    alert(qqGroup);
                }
                catch (err) {
                    return "Failed to get group number";
                }
            }
        });
    }

    function unbanIP() {
        var confirmUnban = confirm("Attempt self-service IP unban?\n(Note: This feature depends on server-side support and may require specific conditions)");
        if (confirmUnban) {
            GM_xmlhttpRequest({
                method: "GET", // Assuming GET, could be POST
                url: queryUrl + "unban", // Assumed endpoint
                onload: function (response) {
                    if (response.status == 200) {
                        alert("Server response: " + response.responseText);
                    } else {
                        alert("Unban request failed, status code: " + response.status);
                    }
                },
                onerror: function (err) {
                    alert("Request error");
                }
            });
        }
    }

    function ymConfig() {
        var div = document.createElement("div");
        div.style.cssText = 'width: 700px; height: 250px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; border: 1px solid black; z-index: 9999999999; text-align: center; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.75); border-radius: 10px; overflow: auto; color: #000;';
        div.innerHTML = `
        <h3 style='margin-bottom: 12px; font-weight: bold; font-size: 18px; color: #000;'>Calculation Type</h3>
        <button style='position: absolute; top: 10px; left: 10px; width: 100px; height: 30px; line-height: 30px; text-align: center; font-size: 13px; margin: 10px;color: #000;' id='gettoken'>Fill Token</button>
        <table style='width:100%; border-collapse:collapse; border: 1px solid black; color: #000;'>
        <thead style='background-color: #e0e0e0; color: #000; font-weight: bold;'>
            <tr>
            <th style='text-align: center; padding: 5px; color: #000;'>Select</th>
            <th style='text-align: center; padding: 5px; color: #000;'>Type</th>
            <th style='text-align: center; padding: 5px; color: #000;'>Description</th>
            </tr>
        </thead>
        <tbody>
            <tr>
            <td style='text-align: center;'><input type="checkbox" /></td>
            <td style='text-align: center; padding: 5px; color: #000;'>50100</td>
            <td style='text-align: center; padding: 5px; color: #000;'>General Digital Calculation (Manual channel, slower)</td>
            </tr>
            <tr>
            <td style='text-align: center;'><input type="checkbox" /></td>
            <td style='text-align: center; padding: 5px; color: #000;'>50101</td>
            <td style='text-align: center; padding: 5px; color: #000;'>Chinese Calculation</td>
            </tr>
            <tr>
            <td style='text-align: center;'><input type="checkbox" /></td>
            <td style='text-align: center; padding: 5px; color: #000;'>50106</td>
            <td style='text-align: center; padding: 5px; color: #000;'>calculate_ry (Machine channel, faster)</td>
            </tr>
        </tbody>
        </table>
        <button style='position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; line-height: 30px; text-align: center; font-size: 18px; font-weight: bold; color: #333; background-color: transparent; border: none; outline: none; cursor: pointer;' id='close'>×</button>
        `;
        document.body.insertBefore(div, document.body.firstChild);

        var gettoken = document.getElementById("gettoken");
        gettoken.onclick = function () {
            saveToken();
            div.remove();
        }
        var close = document.getElementById("close");
        close.onclick = function () {
            div.remove();
        }
        var checkboxes = div.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(cb => {
            cb.addEventListener("click", function () {
                checkboxes.forEach(other => {
                    other.checked = false;
                });
                this.checked = true;
                var row = this.closest("tr");
                var selectedType = row.children[1].innerText;
                GM_setValue("ymConfig", selectedType);
            });

        });

        const selectedValue = GM_getValue("ymConfig", null);
        if (selectedValue) {
            checkboxes.forEach(cb => {
                const row = cb.closest("tr");
                const typeText = row.children[1].innerText;
                if (typeText === selectedValue) {
                    cb.checked = true;
                }
            });
        }
    }
    function setStartDelay() {
        var delay = prompt("If you encounter [First captcha on page not auto-filled, manual refresh works], please try increasing the delay time (unit: ms, default 500ms)", GM_getValue("startDelay", 500));
        if (delay !== null) {
            var delayValue = parseInt(delay);
            if (!isNaN(delayValue) && delayValue >= 0) {
                GM_setValue("startDelay", delayValue);
                topNotice("Delay time set to " + delayValue + " ms, refresh page to take effect");
            } else {
                topNotice("Please enter a valid non-negative integer");
            }
        }
    }
    function manageRules() {
        var rules = GM_getValue("captchaRules", []);
        var div = document.createElement("div");
        div.style.cssText = 'width: 700px; height: 350px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; border: 1px solid black; z-index: 9999999999; text-align: center; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.75); border-radius: 10px; overflow: auto; color: #000;';
        div.innerHTML = `
        <h3 style='margin-bottom: 12px; font-weight: bold; font-size: 18px;color: #000;'>Rule List</h3>
        <button style='position: absolute; top: 10px; left: 10px; width: 50px; height: 30px; line-height: 30px; text-align: center; font-size: 13px; margin: 10px;color: #000;' id='import'>Import</button>
        <button style='position: absolute; top: 10px; left: 70px; width: 50px; height: 30px; line-height: 30px; text-align: center; font-size: 13px; margin: 10px;color: #000;' id='export'>Export</button>
        <button style='position: absolute; top: 10px; left: 130px; width: 120px; height: 30px; line-height: 30px; text-align: center; font-size: 13px; margin: 10px;color: #000;' id='deleteall'>Delete All Rules</button>
        <table id='ruleList' style='width:100%; border-collapse:collapse; border: 1px solid black;color: #000;'>
          <thead style='background-color: #e0e0e0; color: #000; font-weight: bold;'>
            <tr>
              <th style='text-align: center; padding: 5px;color: #000;'>URL</th>
              <th style='text-align: center; padding: 5px;color: #000;'>p_index</th>
              <th style='text-align: center; padding: 5px;color: #000;'>i_index</th>
              <th style='text-align: center; padding: 5px;color: #000;'>c_type</th>
              <th style='text-align: center; padding: 5px;color: #000;'>Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <button style='position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; line-height: 30px; text-align: center; font-size: 18px; font-weight: bold; color: #333; background-color: transparent; border: none; outline: none; cursor: pointer;' id='close'>×</button>
        `;
        document.body.insertBefore(div, document.body.firstChild);
        var table = document.getElementById("ruleList").getElementsByTagName('tbody')[0];
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            var row = table.insertRow(i);
            var urlDiv = document.createElement("div");
            urlDiv.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
            urlDiv.textContent = rule.url;
            row.insertCell(0).appendChild(urlDiv);
            row.insertCell(1).textContent = rule.img;
            row.insertCell(2).textContent = rule.input;
            row.insertCell(3).textContent = rule.captchaType;
            var removeBtn = document.createElement("button");
            removeBtn.className = "remove";
            removeBtn.style.cssText = 'background-color: transparent; color: blue; border: none; padding: 5px; font-size: 14px; border-radius: 5px;';
            removeBtn.innerText = "Delete";
            row.insertCell(4).appendChild(removeBtn);
        }
        var close = document.getElementById("close");
        close.onclick = function () {
            div.remove();
        }

        var remove = document.getElementsByClassName("remove");
        for (var i = 0; i < remove.length; i++) {
            remove[i].onclick = function () {
                var index = this.parentNode.parentNode.rowIndex - 1;
                rules.splice(index, 1);
                GM_setValue("captchaRules", rules);
                this.parentNode.parentNode.remove();
                topNotice("Rule deleted successfully, refresh page to take effect");
            }
        }
        var importBtn = document.getElementById("import");
        importBtn.onclick = function () {
            importRules();
            div.remove();
        }
        var exportBtn = document.getElementById("export");
        exportBtn.onclick = function () {
            exportRules();
        }
        var deleteallBtn = document.getElementById("deleteall");
        deleteallBtn.onclick = function () {
            var r = confirm("Delete all rules?");
            if (r == true) {
                GM_setValue("captchaRules", []);
                var table = document.getElementById("ruleList").getElementsByTagName('tbody')[0];
                table.innerHTML = "";
                topNotice("All rules deleted successfully, refresh page to take effect");
            }
        }
    }

    function saveToken() {
        var token = prompt(`Help Document: https://docs.qq.com/doc/DWkhma0dsb1BxdEtU`, "Enter Token");
        if (token == null) {
            return;
        }
        alert("Token saved successfully");
        GM_setValue("token", token);
    }

    // Manual Add Rule (Action)
    function addRule() {
        var ruleData = { "url": window.location.href.split("?")[0], "img": "", "input": "", "inputType": "", "type": "", "captchaType": "" };
        // Detect right click event
        topNotice("Please 'Right'👉 click on the captcha image");
        document.oncontextmenu = function (e) {
            e = e || window.event;
            e.preventDefault();

            if (e.target.tagName == "IMG" || e.target.tagName == "GIF") {
                var imgList = document.getElementsByTagName('img');
                for (var i = 0; i < imgList.length; i++) {
                    if (imgList[i] == e.target) {
                        var k = i;
                        ruleData.type = "img";
                    }
                }
            }
            else if (e.target.tagName == "CANVAS") {
                var imgList = document.getElementsByTagName('canvas');
                for (var i = 0; i < imgList.length; i++) {
                    if (imgList[i] == e.target) {
                        var k = i;
                        ruleData.type = "canvas";
                    }
                }
            }
            if (k == null) {
                topNotice("Selection error, please re-click the captcha image");
                return;
            }
            ruleData.img = k;
            topNotice("Please 'Left'👈 click on the captcha input box");
            document.onclick = function (e) {
                e = e || window.event;
                e.preventDefault();
                var inputList = document.getElementsByTagName('input');
                var textareaList = document.getElementsByTagName('textarea');
                // console.log(inputList);
                if (e.target.tagName == "INPUT") {
                    ruleData.inputType = "input";
                    for (var i = 0; i < inputList.length; i++) {
                        if (inputList[i] == e.target) {
                            if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                                var k = i - 1;
                            }
                            else {
                                var k = i;
                            }
                        }
                    }
                }
                else if (e.target.tagName == "TEXTAREA") {
                    ruleData.inputType = "textarea";
                    for (var i = 0; i < textareaList.length; i++) {
                        if (textareaList[i] == e.target) {
                            var k = i;
                        }
                    }
                }
                if (k == null) {
                    topNotice("Selection error, please re-click the captcha input box");
                    return;
                }
                ruleData.input = k;
                var r = confirm("Select Captcha Type\n\nClick 'OK' for Digital/English, 'Cancel' for Math");
                if (r == true) {
                    ruleData.captchaType = "general";
                }
                else {
                    ruleData.captchaType = "math";
                }
                addR(ruleData).then((res) => {
                    if (res.status == 200) {
                        topNotice("Rule added successfully");
                        document.oncontextmenu = null;
                        document.onclick = null;
                        start();
                    }
                    else {
                        topNotice("Error, failed to add rule");
                        document.oncontextmenu = null;
                        document.onclick = null;
                    }
                });
            }
        }
    }

    // Manual Add Rule (Request)
    function addR(ruleData) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: queryUrl + "updateRule",
                data: JSON.stringify(ruleData),
                headers: {
                    "Content-Type": "application/json"
                },
                onload: function (response) {
                    return resolve(response);
                }
            });
        });
    }

    // Delete Current Page Rule
    function delRule() {
        var ruleData = { "url": window.location.href.split("?")[0] }
        delR(ruleData).then((res) => {
            if (res.status == 200)
                topNotice("Rule deleted successfully");
            else
                topNotice("Error, failed to delete rule");
        });
    }

    // Delete Rule (Request)
    function delR(ruleData) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: queryUrl + "deleteRule",
                data: JSON.stringify(ruleData),
                headers: {
                    "Content-Type": "application/json"
                },
                onload: function (response) {
                    return resolve(response);
                }
            });
        });
    }

    function isCode() {
        if (element.height >= 100 || element.height == element.width)
            return false;
        var attrList = ["id", "title", "alt", "name", "className", "src"];
        var strList = ["code", "Code", "CODE", "captcha", "Captcha", "CAPTCHA", "yzm", "Yzm", "YZM", "check", "Check", "CHECK", "random", "Random", "RANDOM", "veri", "Veri", "VERI", "Captcha", "Unclear", "Refresh"];
        for (var i = 0; i < attrList.length; i++) {
            for (var j = 0; j < strList.length; j++) {
                var attr = element[attrList[i]];
                if (attr.indexOf(strList[j]) != -1) {
                    return true;
                }
            }
        }
        return false;
    }

    function isInput() {
        var attrList = ["placeholder", "alt", "title", "id", "className", "name"];
        var strList = ["code", "Code", "CODE", "captcha", "Captcha", "CAPTCHA", "yzm", "Yzm", "YZM", "check", "Check", "CHECK", "random", "Random", "RANDOM", "veri", "Veri", "VERI", "Captcha", "Unclear", "Refresh"];
        for (var i = 0; i < attrList.length; i++) {
            for (var j = 0; j < strList.length; j++) {
                var attr = input[attrList[i]];
                if (attr.indexOf(strList[j]) != -1) {
                    return true;
                }
            }
        }
        return false;
    }

    function codeByRule() {
        var code = "";
        var src = element.src;
        if (firstin) {
            firstin = false;
            if (src.indexOf('data:image') != -1) {
                code = src.split("base64,")[1];
                GM_setValue("tempCode", code);
                if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                    GM_setValue("preCode", GM_getValue("tempCode"));
                    p1(code).then((ans) => {
                        if (ans != "")
                            writeIn1(ans);
                        else
                            codeByRule();
                    });
                }
            }
            else if (src.indexOf('blob') != -1) {
                const image = new Image()
                image.src = src;
                image.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = image.width
                    canvas.height = image.height
                    const context = canvas.getContext('2d')
                    context.drawImage(image, 0, 0, image.width, image.height);
                    code = canvas.toDataURL().split("base64,")[1];
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p1(code).then((ans) => {
                            if (ans != "")
                                writeIn1(ans);
                            else
                                codeByRule();
                        });
                    }
                }
            }
            else {
                try {
                    var img = element;
                    if (img.src && img.width != 0 && img.height != 0) {
                        var canvas = document.createElement("canvas");
                        var ctx = canvas.getContext("2d");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0, img.width, img.height);
                        code = canvas.toDataURL("image/png").split("base64,")[1];
                        GM_setValue("tempCode", code);
                        if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                            GM_setValue("preCode", GM_getValue("tempCode"));
                            p1(code).then((ans) => {
                                if (ans != "")
                                    writeIn1(ans);
                                else
                                    codeByRule();
                            });
                        }
                    }
                    else {
                        codeByRule();
                    }
                }
                catch (err) {
                    return;
                }
            }
        }
        else {
            if (src.indexOf('data:image') != -1) {
                code = src.split("base64,")[1];
                GM_setValue("tempCode", code);
                if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                    GM_setValue("preCode", GM_getValue("tempCode"));
                    p1(code).then((ans) => {
                        writeIn1(ans);
                    });
                }
            }
            else if (src.indexOf('blob') != -1) {
                const image = new Image()
                image.src = src;
                image.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = image.width
                    canvas.height = image.height
                    const context = canvas.getContext('2d')
                    context.drawImage(image, 0, 0, image.width, image.height);
                    code = canvas.toDataURL().split("base64,")[1];
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p1(code).then((ans) => {
                            writeIn1(ans);
                        })
                    }
                }
            }
            else {
                var canvas = document.createElement("canvas");
                var ctx = canvas.getContext("2d");
                element.onload = function () {
                    canvas.width = element.width;
                    canvas.height = element.height;
                    ctx.drawImage(element, 0, 0, element.width, element.height);
                    code = canvas.toDataURL("image/png").split("base64,")[1];
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p1(code).then((ans) => {
                            writeIn1(ans);
                        });
                    }
                }
            }
        }
    }

    function canvasRule() {
        setTimeout(function () {
            try {
                var code = element.toDataURL("image/png").split("base64,")[1];
                GM_setValue("tempCode", code);
                if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                    GM_setValue("preCode", GM_getValue("tempCode"));
                    p1(code).then((ans) => {
                        writeIn1(ans);
                    });
                }
            }
            catch (err) {
                canvasRule();
            }
        }, 100);
    }

    function findCode(k) {
        var code = '';
        var codeList = document.getElementsByTagName('img');
        // console.log(codeList);
        for (var i = k; i < codeList.length; i++) {
            var src = codeList[i].src;
            element = codeList[i];
            if (src.indexOf('data:image') != -1) {
                if (isCode()) {
                    firstin = false;
                    code = src.split("base64,")[1];
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p(code, i).then((ans) => {
                            writeIn(ans);
                        });
                    }
                    break;
                }
            }
            else {
                if (isCode()) {
                    if (firstin) {
                        firstin = false;
                        var img = element;
                        if (img.src && img.width != 0 && img.height != 0) {
                            var canvas = document.createElement("canvas");
                            var ctx = canvas.getContext("2d");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0, img.width, img.height);
                            code = canvas.toDataURL("image/png").split("base64,")[1];
                            try {
                                code = canvas.toDataURL("image/png").split("base64,")[1];
                            }
                            catch (err) {
                                findCode(i + 1);
                                return;
                            }
                            GM_setValue("tempCode", code);
                            if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                                iscors = isCORS();
                                GM_setValue("preCode", GM_getValue("tempCode"));
                                p(code, i).then((ans) => {
                                    if (ans != "")
                                        writeIn(ans);
                                    else
                                        findCode(i);
                                });
                                return;
                            }
                        }
                        else {
                            findCode(i);
                            return;
                        }
                    }
                    else {
                        var canvas = document.createElement("canvas");
                        var ctx = canvas.getContext("2d");
                        element.onload = function () {
                            canvas.width = element.width;
                            canvas.height = element.height;
                            ctx.drawImage(element, 0, 0, element.width, element.height);
                            try {
                                code = canvas.toDataURL("image/png").split("base64,")[1];
                            }
                            catch (err) {
                                findCode(i + 1);
                                return;
                            }
                            GM_setValue("tempCode", code);
                            if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                                iscors = isCORS();
                                GM_setValue("preCode", GM_getValue("tempCode"));
                                p(code, i).then((ans) => {
                                    writeIn(ans);
                                });
                                return;
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    function findInput() {
        var inputList = document.getElementsByTagName('input');
        // console.log(inputList);
        for (var i = 0; i < inputList.length; i++) {
            input = inputList[i];
            if (isInput()) {
                return true;
            }
        }
    }

    function writeIn(ans) {
        if (ans == null) return;
        ans = sanitizeAnswer(ans);
        if (ans === "") return;
        if (findInput()) {
            input.value = ans;
            if (typeof (InputEvent) !== "undefined") {
                input.value = ans;
                input.dispatchEvent(new InputEvent('input'));
                var eventList = ['input', 'change', 'focus', 'keypress', 'keyup', 'keydown', 'select'];
                for (var i = 0; i < eventList.length; i++) {
                    fire(input, eventList[i]);
                }
                input.value = ans;
            }
            else if (KeyboardEvent) {
                input.dispatchEvent(new KeyboardEvent("input"));
            }
        }
    }

    function p(code, i) {
        if (!remoteSolverEnabled) {
            return Promise.resolve(null);
        }
        return new Promise((resolve, reject) => {
            const datas = {
                "ImageBase64": String(code),
            }

            // Jitter: Random delay between 500ms and 1500ms
            var jitter = Math.floor(Math.random() * 1000) + 500;
            setTimeout(() => {
                if (document.hidden) {
                    console.log("Page hidden, skipping identification");
                    return resolve(null);
                }

                GM_xmlhttpRequest({
                    method: "POST",
                    url: queryUrl + "identify_GeneralCAPTCHA",
                    data: JSON.stringify(datas),
                    headers: {
                        "Content-Type": "application/json",
                    },
                    responseType: "json",
                    onload: function (response) {
                        if (response.status == 200) {
                            if (response.responseText.indexOf("触发限流策略") != -1)
                                topNotice(response.response["msg"]);
                            try {
                                var result = response.response["result"];
                                console.log("识别结果：" + result);
                                return resolve(result);
                            }
                            catch (e) {
                                if (response.responseText.indexOf("接口请求频率过高") != -1)
                                    topNotice(response.responseText);
                            }
                        }
                        else {
                            // Exponential backoff could be implemented here if needed, 
                            // but for now we just log and move to next
                            try {
                                if (response.response["result"] == null)
                                    findCode(i + 1);
                                else
                                    console.log("识别失败");
                            }
                            catch (err) {
                                console.log("识别失败");
                            }
                        }
                    }
                });
            }, jitter);
        });
    }

    function p1(code) {
        if (captchaType == "general" || captchaType == null) {
            if (!remoteSolverEnabled) {
                return Promise.resolve(null);
            }
            return new Promise((resolve, reject) => {
                const datas = {
                    "ImageBase64": String(code),
                }

                // Jitter: Random delay between 500ms and 1500ms
                var jitter = Math.floor(Math.random() * 1000) + 500;
                setTimeout(() => {
                    if (document.hidden) {
                        console.log("Page hidden, skipping identification");
                        return resolve(null);
                    }

                    GM_xmlhttpRequest({
                        method: "POST",
                        url: queryUrl + "identify_GeneralCAPTCHA",
                        data: JSON.stringify(datas),
                        headers: {
                            "Content-Type": "application/json",
                        },
                        responseType: "json",
                        onload: function (response) {
                            if (response.status == 200) {
                                if (response.responseText.indexOf("触发限流策略") != -1)
                                    topNotice(response.response["msg"]);
                                try {
                                    var result = response.response["result"];
                                    console.log("识别结果：" + result);
                                    return resolve(result);
                                }
                                catch (e) {
                                    if (response.responseText.indexOf("接口请求频率过高") != -1)
                                        topNotice(response.responseText);
                                }
                            }
                            else {
                                console.log("识别失败");
                            }
                        }
                    });
                }, jitter);
            });
        }
        else if (captchaType == "math") {
            if (GM_getValue("token") == undefined) {
                topNotice("识别算术验证码请先填写云码Token");
                return;
            }
            var token = GM_getValue("token").replace(/\+/g, '%2B');
            var type = GM_getValue("ymConfig", "50106");
            const datas = {
                "image": String(code),
                "type": type,
                "token": token
            }
            var developerTag = GM_getValue("developerTag", "");
            if (developerTag) {
                datas["developer_tag"] = developerTag;
            }
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://www.jfbym.com/api/YmServer/customApi",
                    data: JSON.stringify(datas),
                    headers: {
                        "Content-Type": "application/json",
                    },
                    responseType: "json",
                    onload: function (response) {
                        if (response.response["msg"] == "识别成功") {
                            try {
                                var result = response.response["data"]["data"];
                                console.log("识别结果：" + result);
                                return resolve(result);
                            }
                            catch (e) {
                                topNotice(response.response["msg"]);
                            }
                        }
                        else if (response.response["msg"] == "余额不足") {
                            topNotice("云码积分不足，请自行充值");
                        }
                        else {
                            topNotice("请检查Token是否正确");
                        }
                    }
                });
            });
        }
    }

    function isCORS() {
        try {
            if (element.src.indexOf('http') != -1 || element.src.indexOf('https') != -1) {
                if (element.src.indexOf(window.location.host) == -1) {
                    console.log("检测到当前页面存在跨域问题");
                    return true;
                }
                return false;
            }
        }
        catch (err) {
            return;
        }
    }

    function isSafeImageSrc(src) {
        // Only fetch plain http(s) captcha images; never internal/loopback hosts
        try {
            var url = new URL(src, window.location.href);
            if (url.protocol !== "http:" && url.protocol !== "https:") return false;
            if (url.username || url.password) return false;
            var host = url.hostname;
            if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
            if (/^127\.|^10\.|^0\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
            if (host === "::1" || host === "[::1]") return false;
            return true;
        }
        catch (err) {
            return false;
        }
    }

    function p2() {
        return new Promise((resolve, reject) => {
            if (!isSafeImageSrc(element.src)) {
                console.log("Captcha image source rejected by safety check");
                return resolve(null);
            }
            GM_xmlhttpRequest({
                url: element.src,
                method: "GET",
                responseType: "blob",
                onload: function (response) {
                    let blob = response.response;
                    let reader = new FileReader();
                    reader.onloadend = (e) => {
                        let data = e.target.result;
                        element.src = data;
                        return resolve(data);
                    }
                    reader.readAsDataURL(blob);
                }
            });
        });
    }

    function fire(element, eventName) {
        var event = document.createEvent("HTMLEvents");
        event.initEvent(eventName, true, true);
        element.dispatchEvent(event);
    }
    function FireForReact(element, eventName) {
        try {
            let env = new Event(eventName);
            element.dispatchEvent(env);
            var funName = Object.keys(element).find(p => Object.keys(element[p]).find(f => f.toLowerCase().endsWith(eventName)));
            if (funName != undefined) {
                element[funName].onChange(env)
            }
        }
        catch (e) { }
    }

    function writeIn1(ans) {
        if (ans == null) return;
        ans = sanitizeAnswer(ans);
        if (ans === "") return;
        if (input.tagName == "TEXTAREA") {
            input.value = ans;
        }
        else {
            input.value = ans;
            if (typeof (InputEvent) !== "undefined") {
                input.value = ans;
                input.dispatchEvent(new InputEvent('input'));
                var eventList = ['input', 'change', 'focus', 'keypress', 'keyup', 'keydown', 'select'];
                for (var i = 0; i < eventList.length; i++) {
                    fire(input, eventList[i]);
                }
                FireForReact(input, 'change');
                input.value = ans;
            }
            else if (KeyboardEvent) {
                input.dispatchEvent(new KeyboardEvent("input"));
            }
        }
    }

    function compareUrl() {
        return new Promise((resolve, reject) => {
            if (!remoteSolverEnabled) {
                return resolve(false);
            }
            // Only send origin + path, never query strings or fragments
            var datas = { "url": window.location.origin + window.location.pathname };
            GM_xmlhttpRequest({
                method: "POST",
                url: queryUrl + "queryRule",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(datas),
                onload: function (response) {
                    // console.log(response);
                    try {
                        localRules = JSON.parse(response.responseText);
                    }
                    catch (err) {
                        localRules = [];
                    }
                    if (localRules.length == 0)
                        return resolve(false);
                    return resolve(true);
                }
            });
        });
    }

    function start() {
        compareUrl().then((isExist) => {
            if (isExist) {
                exist = true;
                console.log("【Auto Identify & Fill Captcha】Rule exists for this site");
                if (localRules["type"] == "img") {
                    captchaType = localRules["captchaType"];
                    imgIndex = localRules["img"];
                    inputIndex = localRules["input"];
                    element = document.getElementsByTagName('img')[imgIndex];
                    if (localRules["inputType"] == "textarea") {
                        input = document.getElementsByTagName('textarea')[inputIndex];
                    }
                    else {
                        input = document.getElementsByTagName('input')[inputIndex];
                        var inputList = document.getElementsByTagName('input');
                        if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                            inputIndex = parseInt(inputIndex) + 1;
                            input = inputList[inputIndex];
                        }
                    }
                    if (element && input) {
                        iscors = isCORS();
                        if (iscors) {
                            p2().then(() => {
                                codeByRule();
                            });
                        }
                        else {
                            codeByRule();
                        }
                    }
                    else
                        pageChange();
                }
                else if (localRules["type"] == "canvas") {
                    captchaType = localRules["captchaType"];
                    canvasIndex = localRules["img"];
                    inputIndex = localRules["input"];
                    element = document.getElementsByTagName('canvas')[canvasIndex];
                    if (localRules["inputType"] == "textarea") {
                        input = document.getElementsByTagName('textarea')[inputIndex];
                    }
                    else {
                        input = document.getElementsByTagName('input')[inputIndex];
                        var inputList = document.getElementsByTagName('input');
                        if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                            inputIndex = parseInt(inputIndex) + 1;
                            input = inputList[inputIndex];
                        }
                    }
                    iscors = isCORS();
                    if (iscors) {
                        p2().then(() => {
                            canvasRule();
                        });
                    }
                    else {
                        canvasRule();
                    }
                }
            }
            else {
                console.log("【Auto Identify & Fill Captcha】No rule for this site, attempting auto-identification with preset rules...");
                findCode(0);
            }
        });
    }

    function pageChange() {
        if (exist) {
            if (localRules["type"] == "img" || localRules["type"] == null) {
                element = document.getElementsByTagName('img')[imgIndex];
                if (localRules["inputType"] == "textarea") {
                    input = document.getElementsByTagName('textarea')[inputIndex];
                }
                else {
                    input = document.getElementsByTagName('input')[inputIndex];
                    var inputList = document.getElementsByTagName('input');
                    if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                        input = inputList[inputIndex];
                    }
                }
                iscors = isCORS();
                if (iscors) {
                    p2().then(() => {
                        // console.log(data);
                        codeByRule();
                    });
                }
                else {
                    codeByRule();
                }
            }
            else if (localRules["type"] == "canvas") {
                element = document.getElementsByTagName('canvas')[canvasIndex];
                if (localRules["inputType"] == "textarea") {
                    input = document.getElementsByTagName('textarea')[inputIndex];
                }
                else {
                    input = document.getElementsByTagName('input')[inputIndex];
                    var inputList = document.getElementsByTagName('input');
                    if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                        input = inputList[inputIndex];
                    }
                }
                iscors = isCORS();
                if (iscors) {
                    p2().then(() => {
                        canvasRule();
                    });
                }
                else {
                    canvasRule();
                }
            }
        }
        else {
            findCode(0);
        }
    }

    function topNotice(msg) {
        var div = document.createElement('div');
        div.id = 'topNotice';
        div.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 5%; z-index: 9999999999; background: rgba(117,140,148,1); display: flex; justify-content: center; align-items: center; color: #fff; font-family: "Microsoft YaHei"; text-align: center;';
        div.textContent = String(msg).slice(0, 300);
        div.style.fontSize = 'medium';
        document.body.appendChild(div);
        setTimeout(function () {
            document.body.removeChild(document.getElementById('topNotice'));
        }, 3500);
    }

    function manageBlackList() {
        var blackList = GM_getValue("blackList", []);
        var div = document.createElement("div");
        div.style.cssText = 'width: 700px; height: 350px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; border: 1px solid black; z-index: 9999999999; text-align: center; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.75); border-radius: 10px; overflow: auto;';
        div.innerHTML = "<h3 style='margin-bottom: 12px; font-weight: bold; font-size: 18px;'>Blacklist</h3><button style='position: absolute; top: 10px; left: 10px; width: 50px; height: 30px; line-height: 30px; text-align: center; font-size: 13px; margin: 10px' id='add'>Add</button><table id='blackList' style='width:100%; border-collapse:collapse; border: 1px solid black;'><thead style='background-color: #f5f5f5;'><tr><th style='width: 80%; text-align: center; padding: 5px;'>String</th><th style='width: 20%; text-align: center; padding: 5px;'>Action</th></tr></thead><tbody></tbody></table><button style='position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; line-height: 30px; text-align: center; font-size: 18px; font-weight: bold; color: #333; background-color: transparent; border: none; outline: none; cursor: pointer;' id='close'>×</button>";
        document.body.insertBefore(div, document.body.firstChild);
        var table = document.getElementById("blackList").getElementsByTagName('tbody')[0];
        for (var i = 0; i < blackList.length; i++) {
            var row = table.insertRow(i);
            var itemDiv = document.createElement("div");
            itemDiv.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
            itemDiv.textContent = blackList[i];
            row.insertCell(0).appendChild(itemDiv);
            var removeBtn = document.createElement("button");
            removeBtn.className = "remove";
            removeBtn.style.cssText = 'background-color: transparent; color: blue; border: none; padding: 5px; font-size: 14px; border-radius: 5px;';
            removeBtn.innerText = "Remove";
            row.insertCell(1).appendChild(removeBtn);
        }
        var close = document.getElementById("close");
        close.onclick = function () {
            div.remove();
        }
        var add = document.getElementById("add");
        add.onclick = function () {
            var zz = prompt("Please enter a string, any URL containing this string will be added to the blacklist");
            if (zz == null) return;
            var blackList = GM_getValue("blackList", []);
            if (blackList.indexOf(zz) == -1) {
                blackList.push(zz);
                GM_setValue("blackList", blackList);
                var row = table.insertRow(table.rows.length);
                row.insertCell(0).innerHTML = "<div style='white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'>" + zz + "</div>";
                var removeBtn = document.createElement("button");
                removeBtn.className = "remove";
                removeBtn.style.cssText = "background-color: transparent; color: blue; border: none; padding: 5px; font-size: 14px; border-radius: 5px; cursor: pointer; ";
                removeBtn.innerText = "Remove";
                row.insertCell(1).appendChild(removeBtn);
                removeBtn.onclick = function () {
                    var index = this.parentNode.parentNode.rowIndex - 1;
                    blackList.splice(index, 1);
                    GM_setValue("blackList", blackList);
                    this.parentNode.parentNode.remove();
                }
                topNotice("Blacklist added successfully, refresh page to take effect")
            }
            else {
                topNotice("This page is already in the blacklist");
            }
        }
        var remove = document.getElementsByClassName("remove");
        for (var i = 0; i < remove.length; i++) {
            remove[i].onclick = function () {
                var index = this.parentNode.parentNode.rowIndex - 1;
                blackList.splice(index, 1);
                GM_setValue("blackList", blackList);
                this.parentNode.parentNode.remove();
                topNotice("Blacklist removed successfully, refresh page to take effect");
            }
        }
    }

    console.log("【Auto Identify & Fill Captcha】Running...");

    var url = window.location.href;
    var blackList = GM_getValue("blackList", []);
    var inBlack = blackList.some(function (blackItem) {
        return url.includes(blackItem);
    });
    if (inBlack) {
        console.log("【Auto Identify & Fill Captcha】Current page is in blacklist");
        return;
    } else {
        let delay = GM_getValue("startDelay", 500);
        console.log(delay + "ms delay before identification");
        setTimeout(() => {
            start();
        }, delay);
    }

    var imgSrc = "";
    var observerTimeout;
    setTimeout(function () {
        const targetNode = document.body;
        const config = { attributes: true, childList: true, subtree: true };
        const callback = function () {
            if (inBlack) return;
            if (observerTimeout) return; // Throttle: if a timer is active, ignore

            observerTimeout = setTimeout(() => {
                observerTimeout = null;
                try {
                    if (iscors) {
                        if (element == undefined) {
                            pageChange();
                        }
                        if (element.src != imgSrc) {
                            console.log("【Auto Identify & Fill Captcha】Page/Captcha updated, identifying...");
                            imgSrc = element.src;
                            pageChange();
                        }
                    }
                    else {
                        console.log("【Auto Identify & Fill Captcha】Page/Captcha updated, identifying...");
                        pageChange();
                    }
                }
                catch (err) {
                    return;
                }
            }, 1000); // Wait 1 second before processing changes
        }
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }, 1000);

    setTimeout(function () {
        if (inBlack) return;
        try {
            if (element.tagName != "CANVAS") return;
        }
        catch (err) {
            return;
        }
        var canvasData1 = element.toDataURL();
        setInterval(function () {
            var canvasData2 = element.toDataURL();
            if (canvasData1 != canvasData2) {
                console.log("【Auto Identify & Fill Captcha】Page/Captcha updated, identifying...");
                canvasData1 = canvasData2;
                pageChange();
            }
        }, 0);
    }, 1000);

    setTimeout(function () {
        if (inBlack) return;
        var tempUrl = window.location.href;
        setInterval(function () {
            if (tempUrl != window.location.href) {
                console.log("【Auto Identify & Fill Captcha】Page/Captcha updated, identifying...");
                tempUrl = window.location.href;
                start();
            }
        });
    }, 500)
})();
