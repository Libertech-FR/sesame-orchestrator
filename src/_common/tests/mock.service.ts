/**
 * Enhances createMockService to handle an arbitrary number of call behaviors dynamically.
 * @param service The service class to mock.
 * @param methodStubs An object where keys are method names and values are arrays of behaviors for those methods.
 * @returns A mock service instance with dynamically stubbed methods.
 */
export function createMockService<T>(service: new (...args: any[]) => T, methodStubs: Record<string, any[] | any>): T {
  const mockService = {};

  Object.entries(methodStubs).forEach(([method, stubValueOrArray]) => {
    const stubValues = Array.isArray(stubValueOrArray) ? stubValueOrArray : [stubValueOrArray];
    const methodMock = jest.fn();

    stubValues.forEach((stubValue) => {
      methodMock.mockImplementationOnce((...args) => {
        if (typeof stubValue === 'function') {
          return stubValue(...args);
        } else if (stubValue instanceof Error) {
          throw stubValue;
        } else {
          return stubValue;
        }
      });
    });

    mockService[method] = methodMock;
  });

  return mockService as T;
}
