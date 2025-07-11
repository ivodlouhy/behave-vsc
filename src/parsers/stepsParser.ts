import * as vscode from 'vscode';
import { uriId, isStepsFile, sepr, basename, afterFirstSepr, getLines } from '../common';
import { diagLog } from '../logger';

export const parseRepWildcard = ".*";
export const funcRe = /^(async )?def/;
const stepFileStepStartStr = "^\\s*@(behave\\.)?(step|given|when|then)\\(";
const stepFileStepStartRe = new RegExp(`${stepFileStepStartStr}.*`, "i");
const stepFileStepRe = new RegExp(`${stepFileStepStartStr}u?(?:"|')(.+)(?:"|').*\\).*$`, "i");
const stepFileSteps = new Map<string, StepFileStep>();

export class StepFileStep {
  public functionDefinitionRange: vscode.Range = new vscode.Range(0, 0, 0, 0);
  constructor(
    public readonly key: string,
    public readonly uri: vscode.Uri,
    public readonly fileName: string,
    public readonly stepType: string,
    public readonly stepTextRange: vscode.Range,
    public readonly textAsRe: string
  ) { }
}


export function getStepFileSteps(featuresUri: vscode.Uri, removeFileUriPrefix = true): [string, StepFileStep][] {
  const featuresUriMatchString = uriId(featuresUri);
  let steps = [...stepFileSteps].filter(([k,]) => k.startsWith(featuresUriMatchString));
  if (!removeFileUriPrefix)
    return steps;
  steps = [...new Map([...steps].map(([k, v]) => [afterFirstSepr(k), v]))];
  return steps;
}


export function deleteStepFileSteps(featuresUri: vscode.Uri) {
  const wkspStepFileSteps = getStepFileSteps(featuresUri);
  for (const [key,] of wkspStepFileSteps) {
    stepFileSteps.delete(key);
  }
}


export async function parseStepsFileContent(featuresUri: vscode.Uri, content: string, stepFileUri: vscode.Uri, caller: string) {

  if (!isStepsFile(stepFileUri))
    throw new Error(`${stepFileUri.path} is not a steps file`);

  if (!content)
    return;

  const fileUriMatchString = uriId(stepFileUri);

  // clear all existing stepFileSteps for this step file uri
  for (const [key, stepFileStep] of stepFileSteps) {
    if (uriId(stepFileStep.uri) === fileUriMatchString)
      stepFileSteps.delete(key);
  }

  let fileSteps = 0;
  let setFuncLineKeys: string[] = [];
  let multiLineBuilding = false;
  let multiLine = "";
  let startLineNo = 0;
  let multiLineStepType = "";
  const lines = getLines(content);

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {

    let line = lines[lineNo].trim();

    if (line === '' || line.startsWith("#"))
      continue;

    if (line.endsWith("\\"))
      line = line.slice(0, -1).trim();

    if (setFuncLineKeys.length > 0 && funcRe.test(line)) {
      setFuncLineKeys.forEach(key => {
        const step = stepFileSteps.get(key);
        if (!step)
          throw `could not find step for key ${key}`;
        step.functionDefinitionRange = new vscode.Range(lineNo, 0, lineNo, line.length);
      });
      setFuncLineKeys = [];
    }

    const foundStep = stepFileStepStartRe.exec(line);
    if (foundStep) {
      if (line.endsWith("(")) {
        startLineNo = lineNo;
        multiLineStepType = foundStep[2];
        multiLineBuilding = true;
        continue;
      }
      if (line.endsWith('"') || line.endsWith("'")) {
        startLineNo = lineNo;
        multiLineStepType = foundStep[2];
        multiLineBuilding = true;
        multiLine = line.replaceAll(new RegExp(`${stepFileStepStartStr}`, "ig"), "");
        continue;
      }
    }

    if (multiLineBuilding) {
      if (line.endsWith(")")) {
        multiLine += line.replaceAll(`)$`, "");
        multiLine = multiLine.replaceAll("''", "");
        multiLine = multiLine.replaceAll('""', "");
        multiLineBuilding = false;
      }
      else {
        multiLine += line;
        continue;
      }
    }


    if (multiLine) {
      line = `@${multiLineStepType}(${multiLine})`;
      multiLine = "";
    }
    else {
      startLineNo = lineNo;
    }


    const step = stepFileStepRe.exec(line);
    if (step) {
      const range = new vscode.Range(new vscode.Position(startLineNo, 0), new vscode.Position(lineNo, step[0].length));
      const stepFsRk = createStepFileStepAndReKey(featuresUri, stepFileUri, range, step);
      if (stepFileSteps.get(stepFsRk.reKey))
        diagLog("replacing duplicate step file step reKey: " + stepFsRk.reKey);
      stepFileSteps.set(stepFsRk.reKey, stepFsRk.stepFileStep); // map.set() = no duplicate keys allowed (per workspace)
      fileSteps++;
      setFuncLineKeys.push(stepFsRk.reKey);
    }

  }

  diagLog(`${caller}: parsed ${fileSteps} steps from ${stepFileUri.path}`);
}


function createStepFileStepAndReKey(featuresUri: vscode.Uri, fileUri: vscode.Uri, range: vscode.Range, step: RegExpExecArray) {
  const stepType = step[2];
  let textAsRe = step[3].trim();
  textAsRe = textAsRe.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
  textAsRe = textAsRe.replace(/{.*?}/g, parseRepWildcard);
  const fileName = basename(fileUri);
  // NOTE: it's important the key contains the featuresUri, NOT the fileUri, because we 
  // don't want to allow duplicate text matches in the workspace
  const reKey = `${uriId(featuresUri)}${sepr}^${stepType}${sepr}${textAsRe}$`;
  const stepFileStep = new StepFileStep(reKey, fileUri, fileName, stepType, range, textAsRe);
  return { reKey, stepFileStep };
}
