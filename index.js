const watch = require('watch');
const plantuml = require('node-plantuml');
const fs = require('fs');
const path = require('path');

const style = path.resolve(__dirname, '.plantstyles');

/**
 * Logs a dated message to the console.
 * @param {string} message - The message to log.
 */
function log(message) {
    const now = new Date();
    console.log(`[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}] ${message}`);
}

/**
 * Generates/regenerates a diagram based on a PlantUML file.
 * @param {string} pathToFile - The absolute file path to the PlantUML file.
 */
function generateDiagram(pathToFile) {
    cleanupDiagram(pathToFile);
    const diagramPath = calculateDiagramPath(pathToFile);
    log("Generating " + diagramPath);
    try {
        const gen = plantuml.generate(pathToFile, { format: "png", config: style });
        gen.out.pipe(fs.createWriteStream(diagramPath));
    } catch (error) {
        console.error(error);
    }
}

/**
 * Removes a diagram based on a PlantUML file.
 * @param {string} pathToFile - The absolute file path to the PlantUML file.
 */
function cleanupDiagram(pathToFile) {
    const diagramPath = calculateDiagramPath(pathToFile);
    try {
        if (fs.existsSync(diagramPath)) {
            log("Removing " + diagramPath);
            fs.unlinkSync(diagramPath);
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Determines the path to the generated visual diagram based on the
 * location of a PlantUML file.
 * @param {string} pathToFile - The absolute file path to the PlantUML file.
 * @return {string} The absolute path to the diagram associated with the PlantUML file.
 */
function calculateDiagramPath(pathToFile) {
    const filename = path.basename(pathToFile, ".puml") + ".png";
    return path.join(path.dirname(pathToFile), filename);
}

const watchOptions = {
    filter: function (f, stat) {
        return stat && stat.isDirectory() && f.indexOf(".git") < 1 && f.indexOf(".vscode") < 1 && f.indexOf("node_modules") < 1 && f.indexOf("_build") < 1 || f.endsWith('.puml');
    }
};

watch.watchTree(__dirname, watchOptions, function (f, curr, prev) {
    if (typeof f === "object") {
        return;
    }

    const absolutePath = path.resolve(__dirname, f);

    if (prev === null) {
        // f is a new file
        if (curr.isDirectory()) {
            log("Ignoring new directory " + absolutePath);
            return;
        }

        log("Watch 'new' " + absolutePath);
        generateDiagram(absolutePath);
        return;
    } else if (curr.nlink === 0) {
        // f was removed
        if (prev.isDirectory()) {
            log("Ignoring deleted directory " + absolutePath);
            return;
        }

        log("Watch 'removed' " + absolutePath);
        cleanupDiagram(absolutePath);
        return;
    } else {
        // f was changed
        if (curr.isDirectory()) {
            log("Ignoring changed directory " + absolutePath);
            return;
        }

        log("Watch 'changed' " + absolutePath);
        generateDiagram(absolutePath);
    }
});
