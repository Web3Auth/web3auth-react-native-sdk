export interface IWeb3authRNError extends Error {
  code: number;
  message: string;
  toString(): string;
}

export type ErrorCodes = {
  [key: number]: string;
};

export abstract class Web3authRNError extends Error implements IWeb3authRNError {
  code: number;

  message: string;

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message || "";
  }

  toJSON(): IWeb3authRNError {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

export class InitializationError extends Web3authRNError {
  protected static messages: ErrorCodes = {
    5000: "Custom",
    5001: "Invalid constructor params",
    5002: "SDK not initialized. please call init first",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);
  }

  public static fromCode(code: number, extraMessage = ""): Web3authRNError {
    return new InitializationError(code, `${InitializationError.messages[code]}, ${extraMessage}`);
  }

  public static invalidParams(extraMessage = ""): Web3authRNError {
    return InitializationError.fromCode(5001, extraMessage);
  }

  public static notInitialized(extraMessage = ""): Web3authRNError {
    return InitializationError.fromCode(5002, extraMessage);
  }
}

/**
 * login errors
 */

export class LoginError extends Web3authRNError {
  protected static messages: ErrorCodes = {
    5000: "Custom",
    5111: "Invalid login params",
    5112: "User not logged in.",
    5113: "login popup has been closed by the user",
    5114: "Login failed",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);
  }

  public static fromCode(code: number, extraMessage = ""): Web3authRNError {
    return new LoginError(code, `${LoginError.messages[code]}, ${extraMessage}`);
  }

  public static invalidLoginParams(extraMessage = ""): Web3authRNError {
    return LoginError.fromCode(5111, extraMessage);
  }

  public static userNotLoggedIn(extraMessage = ""): Web3authRNError {
    return LoginError.fromCode(5112, extraMessage);
  }

  public static popupClosed(extraMessage = ""): Web3authRNError {
    return LoginError.fromCode(5113, extraMessage);
  }

  public static loginFailed(extraMessage = ""): Web3authRNError {
    return LoginError.fromCode(5114, extraMessage);
  }
}
