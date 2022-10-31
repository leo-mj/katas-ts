import { Instruction, RegisterOperation, LabelJump, FunctionCall, ComplexRegisterCommand, RegisterKey, Integer, LabelJumpCommand, FunctionCallCommand } from "./assemblerTypes";

export function parseProgram(program: string): Instruction[] {
    const rawLines: string[] = program.split("\n");
    const linesAsInstructions: Instruction[] = rawLines.map(parseLine);
    return linesAsInstructions;
  }
  
  export function parseLine(lineStr: string): Instruction {
    const lineStrWithoutComments: string = lineStr.split(";")[0];
    if (lineStrWithoutComments === "") {
      return { command: "comment" };
    }
    if (lineStrWithoutComments.substring(-1) === ":") {
      const labelName: string = lineStrWithoutComments.substring(
        0,
        lineStrWithoutComments.length - 1,
      );
      return { command: "label", labelName };
    }
    const splitLine: string[] = lineStrWithoutComments.split(" ");
    const commandWithArgs: Instruction = parseCommand(splitLine);
    return commandWithArgs;
  }
  
  export function parseCommand(splitLine: string[]): Instruction {
    const command: string = splitLine[0];
    let args: string[] = splitLine.slice(1);
    if (args[0] === "" || args[0] === " ") {
      args = args.slice(1);
    }
    switch (command) {
      case "mov":
      case "inc":
      case "dec":
      case "add":
      case "sub":
      case "mul":
      case "div":
        const registerOperation: RegisterOperation = parseRegisterOperation(
          command,
          args,
        );
        return registerOperation;
      case "jmp":
      case "cmp":
      case "jne":
      case "je":
      case "jge":
      case "jg":
      case "jle":
      case "jl":
        const labelJump: LabelJump = parseLabelJump(command, args);
        return labelJump;
      case "call":
      case "ret":
      case "msg":
      case "end":
        const functionCall: FunctionCall = parseFunctionCall(command, args);
        return functionCall;
      default:
        throw new Error("Unknown command when parsing instruction: " + command);
    }
  }
  
  function parseRegisterOperation(
    command: ComplexRegisterCommand | "inc" | "dec",
    args: string[],
  ): RegisterOperation {
    const targetReg: RegisterKey = args[0].substring(0, args[0].length - 1); // to get rid of the comma
  
    if (command === "inc" || command === "dec") {
      return { command, targetReg };
    }
    let regOrVal: Integer | RegisterKey = args[1];
    if (regOrVal.toUpperCase() === regOrVal.toLowerCase()) {
      regOrVal = parseInt(regOrVal);
    }
    return { command, targetReg, regOrVal };
  }
  
  function parseLabelJump(
    command: LabelJumpCommand | "cmp",
    args: string[],
  ): LabelJump {
    if (command === "cmp") {
      const [regOrVal1, regOrVal2]: string[] = args;
      return {
        command,
        regOrVal1: regOrVal1.substring(0, regOrVal1.length - 1),
        regOrVal2,
      }; // to get rid of the comma
    }
    const labelName: string = args[0];
    return { command, labelName };
  }
  
  function parseFunctionCall(
    command: FunctionCallCommand,
    args: string[],
  ): FunctionCall {
    if (command === "end" || command === "ret") {
      return { command };
    }
    if (command === "call") {
      const labelName: string = args[0];
      return { command, labelName };
    }
    return { command, message: args.join(" ") };
  }
  
  
  