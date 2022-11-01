import {
  Cmp,
  Dictionary,
  ExecutionContext,
  FunctionCall,
  Instruction,
  Integer,
  LabelJump,
  RegisterKey,
  RegisterOperation,
  ReturnValue,
} from "./assemblerTypes";

export function executeAllLines(
  programLines: Instruction[],
  dictionary: Dictionary,
): ReturnValue {
  const executionContext: ExecutionContext = {
    linePointer: 0,
    nextLine: 1,
    returnValue: -1,
    linesToReturnTo: [],
    dictionary,
  };

  while (programLines[executionContext.linePointer].command !== "end") {
    console.log(
      programLines[executionContext.linePointer],
      executionContext.returnValue,
    );
    executeLine(executionContext, programLines);
    executionContext.linePointer = executionContext.nextLine;
    if (executionContext.linePointer >= programLines.length) {
      return -1;
    }
  }

  return executionContext.returnValue;
}

export function executeLine(
  executionContext: ExecutionContext,
  programLines: Instruction[],
): void {
  const { linePointer, dictionary } = executionContext;
  const currentLine: Instruction = programLines[linePointer];
  switch (currentLine.command) {
    case "comment":
    case "label":
      return;
    case "mov":
    case "inc":
    case "dec":
    case "add":
    case "sub":
    case "mul":
    case "div":
      executeRegisterOperation(currentLine, dictionary);
      executionContext.nextLine = linePointer + 1;
      break;
    case "cmp":
      executeCmp(currentLine, executionContext);
      executionContext.nextLine = linePointer + 1;
      break;
    case "jmp":
    case "jne":
    case "je":
    case "jge":
    case "jg":
    case "jle":
    case "jl":
      executeLabelJump(executionContext, currentLine, programLines);
      break;
    case "call":
      executeCall(executionContext, currentLine, programLines);
      break;
    case "ret":
      executeRet(executionContext);
      break;
    case "msg":
      executeMsg(executionContext, currentLine);
      executionContext.nextLine = linePointer + 1;
      break;
  }

  return;
}

export function executeMsg(
  executionContext: ExecutionContext,
  currentLine: FunctionCall,
): void {
  if (currentLine.command !== "msg") {
    throw new Error("Unknown command: " + currentLine.command);
  }
  const { message } = currentLine;
  const translatedMessage: string = translateMessage(
    message,
    executionContext.dictionary,
  );
  executionContext.returnValue = translatedMessage;
  return;
}

export function translateMessage(
  message: string,
  dictionary: Dictionary,
): string {
  const splitMessage = cleanUpMessage(message);
  const translatedSplitMessage = splitMessage.map((part) => {
    if (part.includes("'")) {
      const strMsg = part.split("'").filter((char) => char !== "");
      return strMsg;
    }
    const registerKey: RegisterKey = part.trim();

    if (dictionary[registerKey] !== undefined) {
      return dictionary[registerKey].toString();
    }
    throw new Error(part + " is not in dictionary: " + dictionary);
  });

  const translatedMessage = translatedSplitMessage.join("");
  return translatedMessage;
}

function cleanUpMessage(message: string): string[] {
  const splitMessage: string[] = [];
  let betweenTicks = false;
  let currentWord = "";
  for (let i = 0; i < message.length; i++) {
    const char = message[i];
    switch (betweenTicks) {
      case false:
        if (char !== "'" && char !== "" && char !== " " && char !== ",") {
          currentWord += char;
        } else if (char === "'" && currentWord !== "") {
          splitMessage.push(currentWord);
          currentWord = "'";
          betweenTicks = true;
        } else if (char === "'") {
          currentWord = "'";
          betweenTicks = true;
        }
        break;
      case true:
        if (char !== "'") {
          currentWord += char;
        } else {
          currentWord += "'";
          splitMessage.push(currentWord);
          currentWord = "";
          betweenTicks = false;
        }
        break;
    }
  }
  if (currentWord !== "") {
    splitMessage.push(currentWord);
  }
  return splitMessage;
}

export function executeRet(executionContext: ExecutionContext): void {
  if (executionContext.linesToReturnTo.length < 1) {
    throw new Error("No line to return to");
  }
  executionContext.nextLine =
    executionContext.linesToReturnTo[
      executionContext.linesToReturnTo.length - 1
    ];
  executionContext.linesToReturnTo.pop();
  return;
}

export function executeCall(
  executionContext: ExecutionContext,
  currentLine: FunctionCall,
  programLines: Instruction[],
): void {
  const { command } = currentLine;
  if (command !== "call") {
    throw new Error("No label after call command");
  }
  const { labelName } = currentLine;
  executionContext.nextLine = findLabelIndex(labelName, programLines) + 1;
  executionContext.linesToReturnTo.push(executionContext.linePointer + 1);
  return;
}

export function executeLabelJump(
  executionContext: ExecutionContext,
  currentLine: LabelJump,
  programLines: Instruction[],
): void {
  const { command, labelName } = currentLine;
  const labelIndex: number = findLabelIndex(labelName, programLines);
  switch (command) {
    case "jmp":
      executionContext.nextLine = labelIndex + 1;
      return;
    case "jne":
      if (executionContext.returnValue !== "equal") {
        executionContext.nextLine = labelIndex + 1;
      } else {
        executionContext.nextLine++;
      }
      return;
    case "je":
      if (executionContext.returnValue === "equal") {
        executionContext.nextLine = labelIndex + 1;
      } else {
        executionContext.nextLine++;
      }
      return;
    case "jge":
      if (
        executionContext.returnValue === "equal" ||
        executionContext.returnValue === "greater"
      ) {
        executionContext.nextLine = labelIndex + 1;
      } else {
        executionContext.nextLine++;
      }
      return;
    case "jg":
      if (executionContext.returnValue === "greater") {
        executionContext.nextLine = labelIndex + 1;
      } else {
        executionContext.nextLine++;
      }
      return;
    case "jle":
      if (
        executionContext.returnValue === "equal" ||
        executionContext.returnValue === "less"
      ) {
        executionContext.nextLine = labelIndex + 1;
      } else {
        executionContext.nextLine++;
      }
      return;
    case "jl":
      if (executionContext.returnValue === "less") {
        executionContext.nextLine = labelIndex + 1;
      } else {
        executionContext.nextLine++;
      }
      return;
    default:
      throw new Error(`Unknown label: ${labelName}, or command: ${command}`);
  }
}

export function findLabelIndex(
  labelName: string,
  programLines: Instruction[],
): number {
  for (let i = 0; i < programLines.length; i++) {
    const currentLine = programLines[i];
    if (
      currentLine.command === "label" &&
      currentLine.labelName === labelName
    ) {
      return i;
    }
  }
  throw new Error("Unknown label: " + labelName);
}

export function executeCmp(
  currentLine: Cmp,
  executionContext: ExecutionContext,
): void {
  const { regOrVal1, regOrVal2 } = currentLine;
  let [val1, val2]: (string | Integer)[] = [regOrVal1, regOrVal2];
  if (typeof val1 === "string") {
    val1 = executionContext.dictionary[val1];
  }
  if (typeof val2 === "string") {
    val2 = executionContext.dictionary[val2];
  }
  if (val1 === val2) {
    executionContext.returnValue = "equal";
    return;
  }
  if (val1 > val2) {
    executionContext.returnValue = "greater";
    return;
  }
  if (val1 < val2) {
    executionContext.returnValue = "less";
    return;
  }
  throw new Error(
    "Unknown registers or values: " + regOrVal1 + " and " + regOrVal2,
  );
}

export function executeRegisterOperation(
  currentLine: RegisterOperation,
  dictionary: Dictionary,
): Dictionary {
  const { command, targetReg, regOrVal } = currentLine;
  switch (command) {
    case "mov":
      if (typeof regOrVal === "number") {
        dictionary[targetReg] = regOrVal;
      } else {
        dictionary[targetReg] = dictionary[regOrVal];
      }
      break;
    case "inc":
    case "dec":
    case "add":
      if (typeof regOrVal === "number") {
        dictionary[targetReg] += regOrVal;
      } else {
        dictionary[targetReg] += dictionary[regOrVal];
      }
      break;
    case "sub":
      if (typeof regOrVal === "number") {
        dictionary[targetReg] -= regOrVal;
      } else {
        dictionary[targetReg] -= dictionary[regOrVal];
      }
      break;
    case "mul":
      if (typeof regOrVal === "number") {
        dictionary[targetReg] *= regOrVal;
      } else {
        dictionary[targetReg] *= dictionary[regOrVal];
      }
      break;
    case "div":
      const divisor: number =
        typeof regOrVal === "number" ? regOrVal : dictionary[regOrVal];
      dictionary[targetReg] = Math.floor(dictionary[targetReg] / divisor);
      break;
    default:
      throw new Error(
        `Unknown targetRegister: ${targetReg}, or value: ${regOrVal}`,
      );
  }
  return dictionary;
}
