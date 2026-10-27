var bars = document.getElementById("bars");
var size = document.getElementById("size");
var speed = document.getElementById("speed");
var algorithm = document.getElementById("algorithm");
var scrub = document.getElementById("scrub");

var array = [];
var originalArray = [];
var steps = [];
var stepNumber = 0;

var comparisons = 0;
var writes = 0;
var timer = null;
var running = false;
var paused = false;
var startTime = 0;
var elapsed = 0;

var sorted = [];

var highlight1 = -1;
var highlight2 = -1;
var highlightType = "compare";

// Pseudocode shown next to the bars. Each step in the animation points at one of these lines.
var PSEUDO = {
    bubble: [
        "for i = 0 to n - 2",
        "  swapped = false",
        "  for j = 0 to n - i - 2",
        "    if a[j] > a[j+1]",
        "      swap(a[j], a[j+1])",
        "      swapped = true",
        "  mark a[n-i-1] as sorted",
        "  if not swapped: stop"
    ],
    selection: [
        "for i = 0 to n - 2",
        "  min = i",
        "  for j = i + 1 to n - 1",
        "    if a[j] < a[min]: min = j",
        "  if min != i: swap(a[i], a[min])",
        "  mark a[i] as sorted"
    ],
    insertion: [
        "for i = 1 to n - 1",
        "  key = a[i];  j = i - 1",
        "  while j >= 0 and a[j] > key",
        "    a[j+1] = a[j];  j = j - 1",
        "  a[j+1] = key"
    ],
    merge: [
        "mergeSort(left, right)",
        "  if right - left <= 1: return",
        "  mid = (left + right) / 2",
        "  mergeSort(left, mid);  mergeSort(mid, right)",
        "  while both halves have values",
        "    compare L[i] and R[j]",
        "    copy the smaller one into a[k]",
        "  copy any remaining values"
    ],
    quick: [
        "quickSort(low, high)",
        "  if low >= high: return",
        "  pivot = a[high];  i = low",
        "  for j = low to high - 1",
        "    if a[j] < pivot",
        "      swap(a[i], a[j]);  i = i + 1",
        "  swap(a[i], a[high])",
        "  mark a[i] as sorted",
        "  quickSort(low, i-1);  quickSort(i+1, high)"
    ],
    heap: [
        "heapify(size, root)",
        "  largest = root",
        "  compare both children with a[largest]",
        "  if largest != root: swap, heapify(size, largest)",
        "build a max heap with heapify",
        "for end = n - 1 down to 1",
        "  swap(a[0], a[end])",
        "  mark a[end] as sorted",
        "  heapify(end, 0)"
    ]
};

var codeAlgo = "";

// Which pseudocode line does a step belong to?
function lineFor(algo, type, msg) {
    if (type == "done") {
        return -1;
    }

    if (algo == "insertion" && type == "write") {
        return msg.indexOf("Inserting") == 0 ? 4 : 3;
    }
    if (algo == "merge" && type == "write") {
        return msg.indexOf("remaining") != -1 ? 7 : 6;
    }
    if (algo == "quick" && type == "swap") {
        return msg.indexOf("pivot") != -1 ? 6 : 5;
    }
    if (algo == "heap" && type == "swap") {
        return msg.indexOf("largest") != -1 ? 6 : 3;
    }

    var map = {
        bubble: { compare: 3, swap: 4, mark: 6 },
        selection: { compare: 3, swap: 4, mark: 5 },
        insertion: { key: 1, compare: 2 },
        merge: { compare: 5 },
        quick: { pivot: 2, compare: 4, mark: 7 },
        heap: { compare: 2, mark: 7 }
    };

    if (map[algo] && map[algo][type] !== undefined) {
        return map[algo][type];
    }

    return -1;
}

// Short "what just ran" text under the code
function traceText(step) {
    if (step.type == "compare") {
        return "compare a[" + step.i + "] = " + array[step.i] + " with a[" + step.j + "] = " + array[step.j];
    }
    if (step.type == "swap") {
        return "swap a[" + step.i + "] and a[" + step.j + "]";
    }
    if (step.type == "write") {
        return "a[" + step.i + "] = " + array[step.i];
    }
    if (step.type == "mark") {
        return "a[" + step.i + "] is in its final place";
    }
    if (step.type == "pivot") {
        return "pivot = " + array[step.i];
    }
    if (step.type == "key") {
        return "key = " + array[step.i];
    }
    return "finished";
}

// Draw the pseudocode and move the highlight to the line that is running now
function showCode() {
    var box = document.getElementById("codeLines");
    var panel = document.getElementById("codePanel");
    var trace = document.getElementById("codeTrace");

    if (!box) {
        return;
    }

    if (codeAlgo != algorithm.value) {
        codeAlgo = algorithm.value;
        box.innerHTML = "";

        var hlEl = document.createElement("div");
        hlEl.className = "code-hl";
        hlEl.id = "codeHl";
        box.appendChild(hlEl);

        for (var i = 0; i < PSEUDO[codeAlgo].length; i++) {
            var row = document.createElement("div");
            var num = document.createElement("span");
            var txt = document.createElement("span");

            row.className = "code-line";
            num.className = "ln";
            num.textContent = i + 1;
            txt.textContent = PSEUDO[codeAlgo][i];

            row.appendChild(num);
            row.appendChild(txt);
            box.appendChild(row);
        }

        document.getElementById("codeTitle").textContent =
            algorithm.options[algorithm.selectedIndex].text + " pseudocode";
    }

    var hl = document.getElementById("codeHl");
    var rows = box.querySelectorAll(".code-line");
    var step = stepNumber > 0 ? steps[stepNumber - 1] : null;

    for (var i = 0; i < rows.length; i++) {
        rows[i].classList.remove("active");
    }

    if (!step) {
        hl.style.opacity = 0;
        trace.textContent = "Press Start to run the code";
        return;
    }

    trace.textContent = "> " + traceText(step);
    trace.classList.remove("flash");
    void trace.offsetWidth;
    trace.classList.add("flash");

    if (step.line < 0) {
        hl.style.opacity = 0;
        return;
    }

    panel.setAttribute("data-type", step.type);
    rows[step.line].classList.add("active");

    hl.style.opacity = 1;
    hl.style.transform = "translateY(" + (step.line * 26) + "px)";

    // restart the flash so every new step visibly "fires"
    hl.classList.remove("pulse");
    void hl.offsetWidth;
    hl.classList.add("pulse");
}

// Generate a random array
function makeArray() {
    var n = Number(size.value);
    array = [];

    for (var i = 0; i < n; i++) {
        array.push(Math.floor(Math.random() * 94) + 5);
    }

    var order = document.getElementById("order").value;

    if (order == "reversed") {
        array.sort(function(a, b) {
            return b - a;
        });
    }

    if (order == "nearly") {
        array.sort(function(a, b) {
            return a - b;
        });

        for (var i = 0; i < 3 && n > 1; i++) {
            var x = Math.floor(Math.random() * n);
            var y = Math.floor(Math.random() * n);

            var temp = array[x];
            array[x] = array[y];
            array[y] = temp;
        }
    }

    if (order == "few") {
        var values = [15, 35, 55, 75, 95];

        for (var i = 0; i < n; i++) {
            array[i] = values[Math.floor(Math.random() * values.length)];
        }
    }

    loadArray(array, n + " elements · unsorted",
        "Press Start, drag across the bars to draw your own array, or use the arrow keys to step.");
}

// Load an array into the visualizer and reset all state
function loadArray(values, label, statusText) {
    array = values.slice();
    originalArray = array.slice();

    stopSorting();

    comparisons = 0;
    writes = 0;
    elapsed = 0;
    sorted = [];
    highlight1 = -1;
    highlight2 = -1;

    buildSteps();
    renderBars();
    updateStats();
    syncScrub();

    document.getElementById("arrayLabel").textContent = label;

    document.getElementById("startBtn").disabled = false;
    document.getElementById("pauseBtn").disabled = true;
    document.getElementById("pauseBtn").textContent = "Ⅱ Pause";

    setStatus("Ready to sort", statusText);
}

// Read numbers typed by the user and use them as the array
function useCustomArray() {
    var input = document.getElementById("customArray");
    var error = document.getElementById("customError");
    var parts = input.value.split(/[\s,;]+/).filter(function(p) {
        return p !== "";
    });

    error.textContent = "";

    if (parts.length < 2) {
        error.textContent = "Enter at least 2 numbers, e.g. 40, 12, 85, 27.";
        return;
    }

    if (parts.length > 20) {
        error.textContent = "Please enter at most 20 numbers (you entered " + parts.length + ").";
        return;
    }

    var values = [];

    for (var i = 0; i < parts.length; i++) {
        var v = Number(parts[i]);

        if (!isFinite(v) || Math.floor(v) != v || v < 1 || v > 99) {
            error.textContent = "\"" + parts[i] + "\" is not valid. Use whole numbers from 1 to 99.";
            return;
        }

        values.push(v);
    }

    size.value = Math.max(Number(size.min), Math.min(Number(size.max), values.length));
    document.getElementById("sizeOut").textContent = values.length + " bars";

    loadArray(values, values.length + " elements · custom, unsorted",
        "Your array is loaded. Press Start to sort it.");
}

// Draw the bars (re-uses the same elements so heights animate smoothly)
function renderBars() {
    var showLabels = array.length <= 20;

    if (bars.children.length != array.length) {
        bars.innerHTML = "";

        for (var i = 0; i < array.length; i++) {
            var bar = document.createElement("div");
            var label = document.createElement("span");

            bar.className = "bar";
            label.className = "bar-label";

            bar.appendChild(label);
            bars.appendChild(bar);
        }
    }

    for (var i = 0; i < array.length; i++) {
        var bar = bars.children[i];
        var cls = "bar";

        if (sorted.indexOf(i) != -1) {
            cls += " sorted";
        }

        if (i == highlight1 || i == highlight2) {
            cls += " " + highlightType;
        }

        bar.className = cls;
        bar.style.height = array[i] + "%";
        bar.title = "Index " + i + ": " + array[i];
        bar.firstChild.textContent = showLabels ? array[i] : "";
    }

    showCode();
}

// Save one animation step
function addStep(type, i, j, value, message) {
    steps.push({
        type: type,
        i: i,
        j: j,
        value: value,
        message: message,
        line: lineFor(algorithm.value, type, message)
    });
}

// Build the sorting steps
function buildSteps() {
    steps = [];
    stepNumber = 0;

    var a = originalArray.slice();
    var n = a.length;
    var algo = algorithm.value;

    // Bubble Sort
    if (algo == "bubble") {
        for (var i = 0; i < n - 1; i++) {
            var changed = false;

            for (var j = 0; j < n - i - 1; j++) {
                addStep("compare", j, j + 1, 0,
                    "Comparing adjacent values.");

                if (a[j] > a[j + 1]) {
                    addStep("swap", j, j + 1, 0,
                        "Swapping values.");

                    var temp = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = temp;

                    changed = true;
                }
            }

            addStep("mark", n - i - 1, 0, 0,
                "Position sorted.");

            if (changed == false) {
                break;
            }
        }
    }

    // Selection Sort
    else if (algo == "selection") {
        for (var i = 0; i < n - 1; i++) {
            var min = i;

            for (var j = i + 1; j < n; j++) {
                addStep("compare", min, j, 0,
                    "Searching for the smallest value.");

                if (a[j] < a[min]) {
                    min = j;
                }
            }

            if (min != i) {
                addStep("swap", i, min, 0,
                    "Moving the smallest value.");

                var temp = a[i];
                a[i] = a[min];
                a[min] = temp;
            }

            addStep("mark", i, 0, 0, "Position sorted.");
        }
    }

    // Insertion Sort
    else if (algo == "insertion") {
        for (var i = 1; i < n; i++) {
            var key = a[i];
            var j = i - 1;

            addStep("key", i, 0, 0,
                "Selected " + key + " as the key.");

            while (j >= 0) {
                addStep("compare", j, i, 0,
                    "Comparing a value with the key.");

                if (a[j] > key) {
                    addStep("write", j + 1, 0, a[j],
                        "Moving a value to the right.");

                    a[j + 1] = a[j];
                    j--;
                } else {
                    break;
                }
            }

            addStep("write", j + 1, 0, key,
                "Inserting the key.");

            a[j + 1] = key;
        }
    }

    // Merge Sort
    else if (algo == "merge") {
        function mergeSort(left, right) {
            if (right - left <= 1) {
                return;
            }

            var mid = Math.floor((left + right) / 2);

            mergeSort(left, mid);
            mergeSort(mid, right);

            var leftArray = a.slice(left, mid);
            var rightArray = a.slice(mid, right);

            var i = 0;
            var j = 0;
            var k = left;

            while (i < leftArray.length && j < rightArray.length) {
                addStep("compare", left + i, mid + j, 0,
                    "Comparing the two halves.");

                if (leftArray[i] <= rightArray[j]) {
                    addStep("write", k, 0, leftArray[i],
                        "Copying the smaller value.");

                    a[k] = leftArray[i];
                    i++;
                } else {
                    addStep("write", k, 0, rightArray[j],
                        "Copying the smaller value.");

                    a[k] = rightArray[j];
                    j++;
                }

                k++;
            }

            while (i < leftArray.length) {
                addStep("write", k, 0, leftArray[i],
                    "Copying the remaining value.");

                a[k] = leftArray[i];
                i++;
                k++;
            }

            while (j < rightArray.length) {
                addStep("write", k, 0, rightArray[j],
                    "Copying the remaining value.");

                a[k] = rightArray[j];
                j++;
                k++;
            }
        }

        mergeSort(0, n);
    }

    // Quick Sort
    else if (algo == "quick") {
        function quickSort(low, high) {
            if (low >= high) {
                return;
            }

            var pivot = a[high];
            var i = low;

            addStep("pivot", high, 0, 0,
                "Selected " + pivot + " as the pivot.");

            for (var j = low; j < high; j++) {
                addStep("compare", j, high, 0,
                    "Comparing a value with the pivot.");

                if (a[j] < pivot) {
                    if (i != j) {
                        addStep("swap", i, j, 0,
                            "Moving a smaller value left.");

                        var temp = a[i];
                        a[i] = a[j];
                        a[j] = temp;
                    }

                    i++;
                }
            }

            if (i != high) {
                addStep("swap", i, high, 0,
                    "Moving the pivot to its position.");

                var temp = a[i];
                a[i] = a[high];
                a[high] = temp;
            }

            addStep("mark", i, 0, 0, "Pivot position sorted.");

            quickSort(low, i - 1);
            quickSort(i + 1, high);
        }

        quickSort(0, n - 1);
    }

    // Heap Sort
    else if (algo == "heap") {
        function heapify(size, root) {
            var largest = root;
            var left = 2 * root + 1;
            var right = 2 * root + 2;

            if (left < size) {
                addStep("compare", left, largest, 0,
                    "Comparing child values.");

                if (a[left] > a[largest]) {
                    largest = left;
                }
            }

            if (right < size) {
                addStep("compare", right, largest, 0,
                    "Comparing child values.");

                if (a[right] > a[largest]) {
                    largest = right;
                }
            }

            if (largest != root) {
                addStep("swap", root, largest, 0,
                    "Restoring the heap.");

                var temp = a[root];
                a[root] = a[largest];
                a[largest] = temp;

                heapify(size, largest);
            }
        }

        for (var i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(n, i);
        }

        for (var end = n - 1; end > 0; end--) {
            addStep("swap", 0, end, 0,
                "Moving the largest value to the end.");

            var temp = a[0];
            a[0] = a[end];
            a[end] = temp;

            addStep("mark", end, 0, 0, "Position sorted.");

            heapify(end, 0);
        }
    }

    addStep("done", 0, 0, 0, "Sorting completed!");
}

// Apply one step to the state (no drawing)
function applyStep(step) {
    highlight1 = -1;
    highlight2 = -1;
    highlightType = "compare";

    if (step.type == "compare") {
        comparisons++;

        highlight1 = step.i;
        highlight2 = step.j;

        setStatus("Comparing values", step.message);
    }

    else if (step.type == "swap") {
        var temp = array[step.i];
        array[step.i] = array[step.j];
        array[step.j] = temp;

        writes = writes + 2;

        highlight1 = step.i;
        highlight2 = step.j;
        highlightType = "swap";

        setStatus("Swapping values", step.message);
    }

    else if (step.type == "write") {
        array[step.i] = step.value;

        writes++;

        highlight1 = step.i;
        highlightType = "swap";

        setStatus("Writing a value", step.message);
    }

    else if (step.type == "mark") {
        if (sorted.indexOf(step.i) == -1) {
            sorted.push(step.i);
        }

        setStatus("Position sorted", step.message);
    }

    else if (step.type == "pivot") {
        highlight1 = step.i;
        highlightType = "pivot";

        setStatus("Choosing pivot", step.message);
    }

    else if (step.type == "key") {
        highlight1 = step.i;
        highlightType = "pivot";

        setStatus("Insertion key", step.message);
    }

    else if (step.type == "done") {
        sorted = [];

        for (var i = 0; i < array.length; i++) {
            sorted.push(i);
        }

        setStatus("Sorting complete", step.message);

        document.getElementById("arrayLabel").textContent =
            array.length + " elements · sorted";
    }
}

// Perform one step and draw it
function performStep() {
    if (stepNumber >= steps.length) {
        return;
    }

    applyStep(steps[stepNumber]);
    stepNumber++;

    renderBars();
    updateStats();
    syncScrub();
}

// Jump straight to any step (used by the scrubber and Back button)
function jumpTo(k) {
    k = Math.max(0, Math.min(steps.length, k));

    array = originalArray.slice();
    comparisons = 0;
    writes = 0;
    sorted = [];
    highlight1 = -1;
    highlight2 = -1;
    highlightType = "compare";

    document.getElementById("arrayLabel").textContent =
        array.length + " elements · unsorted";

    for (var i = 0; i < k; i++) {
        applyStep(steps[i]);
    }

    stepNumber = k;

    if (k == 0) {
        elapsed = 0;
        setStatus("Ready to sort", "Back at the start.");
    }

    renderBars();
    updateStats();
    syncScrub();
}

// Pause playback without toggling
function holdPlayback() {
    if (running && !paused) {
        paused = true;
        elapsed = (performance.now() - startTime) / 1000;

        clearTimeout(timer);

        document.getElementById("pauseBtn").textContent = "▶ Resume";
    }
}

// Run the animation
function play() {
    if (!running || paused) {
        return;
    }

    performStep();

    if (stepNumber >= steps.length) {
        finishSorting();
        return;
    }

    timer = setTimeout(play, 510 - Number(speed.value) * 4.8);
}

// Start or resume
function start() {
    if (running && paused) {
        paused = false;

        startTime = performance.now() - elapsed * 1000;

        document.getElementById("pauseBtn").textContent = "Ⅱ Pause";

        play();
        return;
    }

    if (stepNumber >= steps.length || steps.length == 0) {
        jumpTo(0);
    }

    running = true;
    paused = false;

    startTime = performance.now() - elapsed * 1000;

    document.getElementById("startBtn").disabled = true;
    document.getElementById("pauseBtn").disabled = false;

    play();
}

// Pause or resume
function pause() {
    if (!running) {
        return;
    }

    if (!paused) {
        holdPlayback();

        setStatus("Paused", "Press Resume, drag the timeline, or step one move at a time.");
    } else {
        paused = false;
        startTime = performance.now() - elapsed * 1000;

        document.getElementById("pauseBtn").textContent = "Ⅱ Pause";

        play();
    }
}

// Stop animation
function stopSorting() {
    clearTimeout(timer);

    running = false;
    paused = false;
    timer = null;
}

// Finish sorting
function finishSorting() {
    stopSorting();

    elapsed = (performance.now() - startTime) / 1000;

    document.getElementById("startBtn").disabled = false;
    document.getElementById("pauseBtn").disabled = true;
    document.getElementById("pauseBtn").textContent = "Ⅱ Pause";

    updateStats();
}

// Move one step forward
function singleStep() {
    if (running) {
        stopSorting();
    }

    if (stepNumber >= steps.length) {
        jumpTo(0);
    }

    document.getElementById("startBtn").disabled = false;
    document.getElementById("pauseBtn").disabled = true;
    document.getElementById("pauseBtn").textContent = "Ⅱ Pause";

    performStep();

    if (stepNumber >= steps.length) {
        finishSorting();
    }
}

// Move one step back
function stepBack() {
    if (running) {
        stopSorting();
    }

    document.getElementById("startBtn").disabled = false;
    document.getElementById("pauseBtn").disabled = true;
    document.getElementById("pauseBtn").textContent = "Ⅱ Pause";

    if (stepNumber > 0) {
        jumpTo(stepNumber - 1);

        var step = steps[stepNumber - 1];
        if (step) {
            setStatus("Stepped back", "Showing the state after: " + step.message);
        }
    }
}

// Reset the array
function reset() {
    stopSorting();

    array = originalArray.slice();

    comparisons = 0;
    writes = 0;
    elapsed = 0;
    sorted = [];

    highlight1 = -1;
    highlight2 = -1;

    buildSteps();
    renderBars();
    updateStats();
    syncScrub();

    document.getElementById("startBtn").disabled = false;
    document.getElementById("pauseBtn").disabled = true;
    document.getElementById("pauseBtn").textContent = "Ⅱ Pause";

    document.getElementById("arrayLabel").textContent =
        array.length + " elements · unsorted";

    setStatus("Ready to sort", "Array reset. Press Start sorting.");
}

// Update algorithm information
function updateAlgorithmInfo() {
    var name = algorithm.options[algorithm.selectedIndex].text;

    document.getElementById("algorithmTitle").textContent = name;

    var description = "";
    var best = "";
    var average = "";
    var worst = "";
    var space = "";

    if (algorithm.value == "bubble") {
        description = "Compares adjacent values and swaps them if needed.";
        best = "O(n)";
        average = "O(n²)";
        worst = "O(n²)";
        space = "O(1)";
    } else if (algorithm.value == "selection") {
        description = "Finds the smallest value and moves it to the front.";
        best = "O(n²)";
        average = "O(n²)";
        worst = "O(n²)";
        space = "O(1)";
    } else if (algorithm.value == "insertion") {
        description = "Inserts each value into its correct position.";
        best = "O(n)";
        average = "O(n²)";
        worst = "O(n²)";
        space = "O(1)";
    } else if (algorithm.value == "merge") {
        description = "Divides the array, sorts the halves, and merges them.";
        best = "O(n log n)";
        average = "O(n log n)";
        worst = "O(n log n)";
        space = "O(n)";
    } else if (algorithm.value == "quick") {
        description = "Uses a pivot to divide values into smaller sections.";
        best = "O(n log n)";
        average = "O(n log n)";
        worst = "O(n²)";
        space = "O(log n)";
    } else if (algorithm.value == "heap") {
        description = "Uses a heap to move the largest values to the end.";
        best = "O(n log n)";
        average = "O(n log n)";
        worst = "O(n log n)";
        space = "O(1)";
    }

    document.getElementById("algorithmDescription").textContent = description;

    document.getElementById("complexityTags").innerHTML =
        '<span class="tag">Best: ' + best + '</span>' +
        '<span class="tag">Average: ' + average + '</span>' +
        '<span class="tag">Worst: ' + worst + '</span>' +
        '<span class="tag">Space: ' + space + '</span>';

    reset();
}

// Update statistics
function updateStats() {
    // The stats boxes were removed from the page, so there is nothing to draw.
    if (!document.getElementById("comparisons")) {
        return;
    }

    var progress = steps.length ? stepNumber / steps.length * 100 : 0;

    document.getElementById("comparisons").textContent = comparisons;
    document.getElementById("swaps").textContent = writes;

    var time = elapsed;

    if (running && !paused) {
        time = (performance.now() - startTime) / 1000;
    }

    document.getElementById("elapsed").innerHTML =
        time.toFixed(2) + " <small>s</small>";

    document.getElementById("progress").innerHTML =
        Math.round(progress) + '<small>%</small>';
}

// Show status
function setStatus(title, message) {
    document.getElementById("statusTitle").textContent = title;
    document.getElementById("statusText").textContent = message;
}

// Keep the timeline slider in sync
function syncScrub() {
    scrub.max = steps.length;
    scrub.value = stepNumber;

    document.getElementById("scrubOut").textContent =
        "Step " + stepNumber + " / " + steps.length;
}

// ---------- Draw your own array by dragging over the bars ----------
var editing = false;

function editFromPointer(e) {
    var rect = bars.getBoundingClientRect();
    var idx = 0;
    var best = Infinity;

    for (var i = 0; i < bars.children.length; i++) {
        var r = bars.children[i].getBoundingClientRect();
        var d = Math.abs(e.clientX - (r.left + r.width / 2));

        if (d < best) {
            best = d;
            idx = i;
        }
    }

    var value = Math.round((1 - (e.clientY - rect.top) / rect.height) * 100);
    value = Math.max(5, Math.min(99, value));

    array[idx] = value;
    originalArray[idx] = value;

    renderBars();
}

bars.addEventListener("pointerdown", function(e) {
    if (running && !paused) {
        setStatus("Sorting in progress", "Pause first if you want to edit the bars.");
        return;
    }

    if (running || stepNumber > 0) {
        reset();
    }

    editing = true;
    bars.classList.add("editing");
    bars.setPointerCapture(e.pointerId);

    editFromPointer(e);
});

bars.addEventListener("pointermove", function(e) {
    if (editing) {
        editFromPointer(e);
    }
});

function endEdit() {
    if (!editing) {
        return;
    }

    editing = false;
    bars.classList.remove("editing");

    buildSteps();
    syncScrub();

    document.getElementById("arrayLabel").textContent =
        array.length + " elements · custom, unsorted";

    setStatus("Custom array", "Nice. Press Start to sort your own values.");
}

bars.addEventListener("pointerup", endEdit);
bars.addEventListener("pointercancel", endEdit);

// ---------- Controls ----------
size.addEventListener("input", function() {
    document.getElementById("sizeOut").textContent = size.value + " bars";
    makeArray();
});

speed.addEventListener("input", function() {
    if (speed.value < 30) {
        document.getElementById("speedOut").textContent = "Slow";
    } else if (speed.value < 70) {
        document.getElementById("speedOut").textContent = "Medium";
    } else {
        document.getElementById("speedOut").textContent = "Fast";
    }
});

scrub.addEventListener("input", function() {
    holdPlayback();
    jumpTo(Number(scrub.value));

    if (stepNumber > 0 && stepNumber < steps.length) {
        // keep the step message for the step we landed on
        setStatus("Scrubbing", steps[stepNumber - 1].message);
    }
});

algorithm.addEventListener("change", updateAlgorithmInfo);

document.getElementById("order").addEventListener("change", makeArray);
document.getElementById("customBtn").addEventListener("click", useCustomArray);
document.getElementById("customArray").addEventListener("keydown", function(e) {
    if (e.key == "Enter") {
        e.preventDefault();
        useCustomArray();
    }
});
document.getElementById("shuffleBtn").addEventListener("click", makeArray);
document.getElementById("resetBtn").addEventListener("click", reset);
document.getElementById("startBtn").addEventListener("click", start);
document.getElementById("pauseBtn").addEventListener("click", pause);
document.getElementById("stepBtn").addEventListener("click", singleStep);
document.getElementById("backBtn").addEventListener("click", stepBack);

// Keyboard shortcuts
document.addEventListener("keydown", function(e) {
    var tag = e.target.tagName;

    if (tag == "INPUT" || tag == "SELECT" || e.ctrlKey || e.metaKey || e.altKey) {
        return;
    }

    if (e.key == " " && tag != "BUTTON") {
        e.preventDefault();

        if (running) {
            pause();
        } else {
            start();
        }
    } else if (e.key == "ArrowRight") {
        e.preventDefault();
        singleStep();
    } else if (e.key == "ArrowLeft") {
        e.preventDefault();
        stepBack();
    } else if (e.key == "r" || e.key == "R") {
        reset();
    } else if (e.key == "g" || e.key == "G") {
        makeArray();
    }
});

// Start the program
document.getElementById("speedOut").textContent = speed.value < 30 ? "Slow" : (speed.value < 70 ? "Medium" : "Fast");
document.getElementById("sizeOut").textContent = size.value + " bars";

makeArray();
updateAlgorithmInfo();
