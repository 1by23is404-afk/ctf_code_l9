
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bootOverlay = document.getElementById('boot-overlay');
    const startBtn = document.getElementById('start-btn');
    const appContainer = document.getElementById('app-container');
    const terminalOutput = document.getElementById('terminal-output'); // Assuming this exists in HTML
    const virtualInput = document.getElementById('virtual-input');
    const successModal = document.getElementById('success-modal');
    const finalInput = document.getElementById('final-input');
    const verifyBtn = document.getElementById('verify-btn');
    const finalFlagDisplay = document.getElementById('final-flag-display');
    const statusIndicator = document.querySelector('.status-indicator span');

    // State
    // "Remove value in one of 20 files... containing the flag"
    // We will simulate this by checking if they try to delete (rm) the file containing the flag.
    let isKeyboardLocked = true;
    let fileSystem = [];
    const FLAG_1 = "ZB{k3y_b0ard_uNl0k3d}";
    const FLAG_2 = "ZB{c0d3_l9_3rr04_f1x3d}";

    // Initialize File System
    function initFileSystem() {
        const fileNames = [
            "kernelb.sys", "ntoskrnl.exe", "hal.dll", "kd.dll", "mcupdate.dll",
            "clfs.sys", "tmn.sys", "bootvid.dll", "ci.dll", "werkernel.sys",
            "drivers.cfg", "input.inf", "i8042prt.sys", "kbdclass.sys", "mouclass.sys",
            "umpdm.sys", "ksecdd.sys", "clipsp.sys", "cng.sys", "msrpc.sys"
        ];

        // Randomly pick one file to hold the flag
        const flagIndex = Math.floor(Math.random() * fileNames.length);

        fileSystem = fileNames.map((name, index) => {
            let content = "binary_data_ok";
            if (index === flagIndex) {
                // The flag is inside this file
                content = `ERROR_LOG: ${FLAG_1}`;
            } else if (Math.random() > 0.7) {
                content = "driver_signature_valid";
            } else {
                content = "system_integrity_verified";
            }

            return {
                name: name,
                content: content,
                isCorrupt: index === flagIndex // This is the file to delete
            };
        });

        console.log("System Initialized. Corrupt file is: " + fileSystem[flagIndex].name); // For debugging/cheating if needed
    }

    initFileSystem();

    // 1. Initial Access
    startBtn.addEventListener('click', () => {
        bootOverlay.style.display = 'none';
        appContainer.style.display = 'flex';
        // Force focus away from any real inputs just in case
        virtualInput.focus();
    });

    // 2. Block Logic
    // We want to block ALL keyboard events globally while locked
    const blockKeyboard = (e) => {
        if (isKeyboardLocked) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    };

    window.addEventListener('keydown', blockKeyboard, true);
    window.addEventListener('keyup', blockKeyboard, true);
    window.addEventListener('keypress', blockKeyboard, true);

    // 3. Virtual Keyboard Logic
    document.querySelectorAll('.key').forEach(keyBtn => {
        keyBtn.addEventListener('click', () => {
            const key = keyBtn.getAttribute('data-key');
            handleVirtualKey(key);
        });
    });

    function handleVirtualKey(key) {
        if (!isKeyboardLocked) return; // If unlocked, maybe virtual keys shouldn't work? Or they can.

        let currentVal = virtualInput.value;

        if (key === 'ENTER') {
            processCommand(currentVal);
            virtualInput.value = '';
        } else if (key === 'BACKSPACE') {
            virtualInput.value = currentVal.slice(0, -1);
        } else if (key === 'SPACE') {
            virtualInput.value = currentVal + ' ';
        } else {
            virtualInput.value = currentVal + key;
        }

        // Scroll end of input into view if needed
        virtualInput.scrollLeft = virtualInput.scrollWidth;
    }

    // 4. Command Processor
    function processCommand(cmdLine) {
        const parts = cmdLine.trim().split(/\s+/); // split by whitespace
        const command = parts[0]?.toLowerCase();
        const arg = parts[1]; // Filename

        writeToTerminal(`C:\\drivers> ${cmdLine}`);

        if (command === 'ls' || command === 'dir') {
            let output = "Directory of C:\\Windows\\System32\\drivers\\\n\n";
            fileSystem.forEach(f => {
                output += `${f.name.padEnd(20)} <FILE>   14KB\n`;
            });
            output += `\n${fileSystem.length} File(s) found.`;
            writeToTerminal(output);
        }
        else if (command === 'cat' || command === 'type') {
            if (!arg) {
                writeToTerminal("Error: Syntax is 'cat [filename]'");
                return;
            }
            const file = fileSystem.find(f => f.name === arg);
            if (file) {
                writeToTerminal(`Reading ${file.name}...\nCONTENT: [ ${file.content} ]`);
            } else {
                writeToTerminal(`Error: File '${arg}' not found.`);
            }
        }
        else if (command === 'rm' || command === 'del' || command === 'delete') {
            if (!arg) {
                writeToTerminal("Error: Syntax is 'rm [filename]'");
                return;
            }
            const index = fileSystem.findIndex(f => f.name === arg);

            if (index !== -1) {
                const file = fileSystem[index];
                if (file.isCorrupt) {
                    // WIN CONDITION 1
                    fileSystem.splice(index, 1);
                    writeToTerminal(`SUCCESS: Corrupt driver '${arg}' removed.`);
                    setTimeout(unlockSystem, 1000);
                } else {
                    // Fake delete
                    fileSystem.splice(index, 1);
                    writeToTerminal(`Deleted '${arg}'. System status still UNSTABLE.`);
                }
            } else {
                writeToTerminal(`Error: File '${arg}' not found.`);
            }
        }
        else if (command === 'help') {
            writeToTerminal("Commands: ls, cat [file], rm [file]");
        }
        else if (command === '') {
            // do nothing
        }
        else {
            writeToTerminal(`'${command}' is not recognized as an internal or external command.`);
        }
    }

    function writeToTerminal(text) {
        // Create a new div line
        const div = document.createElement('div');
        div.className = 'line';
        div.innerText = text;

        // Append
        // Find the input-line and insert before it?
        // Actually structure is: terminal-output -> list of lines -> then input-line is sibling? 
        // HTML structure: terminal-output contains lines. input-line is sibling of terminal-output?
        // Let's check HTML.
        // terminal-window > terminal-output > lines
        // terminal-window > input-line
        // correct.

        terminalOutput.appendChild(div);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    // 5. Unlock System
    function unlockSystem() {
        isKeyboardLocked = false;

        // Remove block listeners
        window.removeEventListener('keydown', blockKeyboard, true);
        window.removeEventListener('keyup', blockKeyboard, true);
        window.removeEventListener('keypress', blockKeyboard, true);

        // Update UI
        statusIndicator.innerText = "UNLOCKED";
        statusIndicator.className = ""; // Remove blink-red
        statusIndicator.style.color = "var(--success-color)";

        // Show Modal
        successModal.classList.remove('hidden');
        finalInput.focus();
    }

    // 6. Final Verification
    verifyBtn.addEventListener('click', checkFinalCode);
    finalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkFinalCode();
    });

    function checkFinalCode() {
        const val = finalInput.value.trim();
        if (val === FLAG_1) {
            finalFlagDisplay.classList.remove('hidden');
            verifyBtn.style.display = 'none';
            finalInput.disabled = true;
            finalInput.style.borderColor = "var(--success-color)";
        } else {
            alert("Incorrect Verification Code. Hint: It was in the file you deleted.");
            finalInput.value = "";
            finalInput.focus();
        }
    }

});
