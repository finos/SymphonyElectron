import * as fs from 'fs';

const extractUserDefaults = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fieldRegex =
    /^\s*sudo -u "\$userName"\s+defaults write "\$plistFilePath"\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
  return Array.from(content.matchAll(fieldRegex), (match) => match[1]);
};

const extractSystemDefaults = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fieldRegex =
    /^\s*defaults write "\$plistFilePath"\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
  return Array.from(content.matchAll(fieldRegex), (match) => match[1]);
};

const isArraySubset = (array1: string[], array2: string[]): boolean => {
  return array2.every((item) => array1.includes(item));
};

const removeFields = (array: string[], stringsToRemove: string[]): string[] => {
  return array.filter((item) => !stringsToRemove.includes(item));
};

describe('Shell Script Field Validation', () => {
  it('should contain all the user defaults fields from JSON', async () => {
    const jsonFilePath = './config/Symphony.config';
    const scriptFilePath = './installer/mac/postinstall.sh';

    // Read Symphony config JSON file
    const jsonContent = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    const fields = Object.keys(jsonContent) as [];
    const filteredFields = removeFields(fields, [
      'notificationSettings',
      'customFlags',
      'permissions',
    ]);

    // Read fields from post install script file
    const scriptFields = extractUserDefaults(scriptFilePath);
    scriptFields.splice(scriptFields.indexOf('ApplicationName'), 1);

    expect(isArraySubset(scriptFields, filteredFields)).toBe(true);
  });

  it('should contain all the system defaults fields from JSON', async () => {
    const jsonFilePath = './config/Symphony.config';
    const scriptFilePath = './installer/mac/postinstall.sh';

    // Read Symphony config JSON file
    const jsonContent = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    const fields = Object.keys(jsonContent) as [];
    const filteredFields = removeFields(fields, [
      'notificationSettings',
      'customFlags',
      'permissions',
    ]);

    // Read fields from post install script file
    const scriptFields = extractSystemDefaults(scriptFilePath);
    scriptFields.splice(scriptFields.indexOf('ApplicationName'), 1);

    expect(isArraySubset(scriptFields, filteredFields)).toBe(true);
  });
});
