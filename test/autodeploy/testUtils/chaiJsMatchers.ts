class ForbiddenValue {
  public name: string;
  public comparator: string | RegExp;
  public matchedCommands: string[];

  public constructor(name: string, commandsFound: string[], comparator?: string | RegExp) {
    this.name = name;
    this.comparator = comparator || name;
    this.matchedCommands = commandsFound;
  }
}

module.exports = function (_chai, utils) {
  const Assertion = _chai.Assertion;

  utils.addProperty(Assertion.prototype, 'undefinedNullOrEmptyValues', function (): any {
    const allCommands = this._obj;
    const pattern = /=('\s+'|"\s+"|\s+|''|"")(\s+|$)/g;

    const allUndefineds = new ForbiddenValue('undefined', allCommands.filter((command: string) => command.includes('undefined')));
    const allNulls = new ForbiddenValue('null', allCommands.filter((command: string) => command.includes('null')));
    const allEmptyValues = new ForbiddenValue('Empty values', allCommands.filter((command: string) => command.match(pattern)), pattern);

    this.assert(
      allUndefineds.matchedCommands.length ||
      allNulls.matchedCommands.length ||
      allEmptyValues.matchedCommands.length
      , 'not mutch sense using "undefinedNullOrEmptyValues" assertion without ".not" flag before the command'
      , compileErrorMessage([allUndefineds, allNulls, allEmptyValues])
    );
  });
};

function compileErrorMessage(allValues: any): string {
  let errorMessage = '';

  const parseFlags = (commands: string[], comparator?: string | RegExp): string[][] => commands.map(
    (command: string) => command.split('--')
      .filter((flag: string) => {
        return typeof comparator === 'string' ? flag.includes(comparator) : flag.match(comparator);
      }));

  const wrapMessage = (value: ForbiddenValue) => {
    return `\n* ${value.name} found in arg(s):\
    \n::: ${parseFlags(value.matchedCommands, value.comparator).join('\n::: ')}\
    \n full command(s):\n::: ${value.matchedCommands.join('\n::: ')}`;
  };

  allValues.forEach((value: ForbiddenValue) => {
    if (value.matchedCommands.length) {
      errorMessage += wrapMessage(value);
    }
  });

  return errorMessage;
}
