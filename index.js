import chokidar from 'chokidar';
import plantUml from 'node-plantuml-latest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const style = path.resolve(__dirname, '.plantstyles');

/**
 * Logs a dated message to the console.
 * @param {string} message The message to log.
 */
function log(message) {
  const now = new Date();
  console.log(
    `[${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now
      .getSeconds()
      .toString()
      .padStart(2, '0')}] ${message}`
  );
}

/**
 * Generates/regenerates a diagram based on a PlantUML file.
 * @param {string} pathToFile The absolute file path to the PlantUML file.
 */
function generateDiagram(pathToFile) {
  cleanupDiagram(pathToFile);
  const diagramPath = calculateDiagramPath(pathToFile);
  log('Generating ' + diagramPath);
  try {
    const content = stripRelativeIncludes(pathToFile);
    const gen = plantUml.generate(content, {
      format: 'png',
      config: style,
      pragma: 'layout=smetana'
    });
    gen.out.pipe(fs.createWriteStream(diagramPath));
  } catch (error) {
    console.error(error);
  }
}

/**
 * Reads the content of the puml file and removes relative !include statements
 * for .plantstyles files.
 * @param {string} pathToFile The absolute file path to the PlantUML file.
 * @returns {string} The stripped content without relative !include statements.
 */
function stripRelativeIncludes(pathToFile) {
  let stripped = '';

  fs.readFileSync(pathToFile, 'utf-8')
    .split(/\r?\n/)
    .forEach((line) => {
      if (!/^!include [./]*.plantstyles$/.test(line)) {
        stripped += line + '\n';
      }
    });

  return stripped;
}

/**
 * Removes a diagram based on a PlantUML file.
 * @param {string} pathToFile The absolute file path to the PlantUML file.
 */
function cleanupDiagram(pathToFile) {
  const diagramPath = calculateDiagramPath(pathToFile);
  try {
    if (fs.existsSync(diagramPath)) {
      log('Removing ' + diagramPath);
      fs.unlinkSync(diagramPath);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Determines the path to the generated visual diagram based on the location of
 * a PlantUML file.
 * @param {string} pathToFile The absolute file path to the PlantUML file.
 * @returns {string} The absolute path to the diagram associated with the
 * PlantUML file.
 */
function calculateDiagramPath(pathToFile) {
  const filename = path.basename(pathToFile, '.puml') + '.png';
  return path.join(path.dirname(pathToFile), filename);
}

const watcher = chokidar
  .watch('.', {
    // Ignore all files except .puml files that are not in node_modules.
    ignored: (path, stats) =>
      stats?.isFile() &&
      !path.endsWith('.puml') &&
      path.indexOf('node_modules') < 0,
    persistent: true,
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
