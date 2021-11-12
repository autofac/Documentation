const chokidar = require('chokidar');
const plantUml = require('node-plantuml');
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
    const gen = plantUml.generate(pathToFile, { format: "png", config: style });
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

const watcher = chokidar
  .watch('**/*.puml', {
    persistent: true,
    ignored: [/(^|[/\\])\../, 'node_modules'],
    cwd: __dirname,
    ignoreInitial: true
  })
  .on('all', (event, path) => {
    switch (event) {
      case 'add':
      case 'change':
        generateDiagram(path);
        break;
      case 'unlink':
        cleanupDiagram(path);
        break;
      default:
        log(`Ignoring event ${event} on ${path}`);
        break;
    }
  });
