import type { AnyObject } from 'yummies/utils/types';
import type { ViewModelsConfig } from '../config/types.js';

export type CircularVmPayloadDependencyTestCase = {
  vmConfig: Partial<ViewModelsConfig>;
  isRecursion: boolean;
};

type VmConfigPropVariant<TProp extends keyof ViewModelsConfig> = {
  property: TProp;
  possibleValues: ViewModelsConfig[TProp][];
};

const vmConfigPropertyVariants = [
  {
    property: 'wrapViewsInObserver',
    possibleValues: [true, false],
  } satisfies VmConfigPropVariant<'wrapViewsInObserver'>,
  {
    property: 'payloadComputed',
    possibleValues: [true, false, 'struct'],
  } satisfies VmConfigPropVariant<'payloadComputed'>,
  {
    property: 'comparePayload',
    possibleValues: ['shallow', 'strict', false],
  } satisfies VmConfigPropVariant<'comparePayload'>,
  {
    property: 'payloadObservable',
    possibleValues: ['deep', 'ref', 'shallow', 'shallow', false],
  } satisfies VmConfigPropVariant<'payloadObservable'>,
];

const createAllVmConfigScenarios = () => {
  const valueArrays = vmConfigPropertyVariants.map(
    (variant) => variant.possibleValues,
  );
  const propertyNames = vmConfigPropertyVariants.map(
    (variant) => variant.property,
  );

  const combinations = valueArrays.reduce(
    (acc, array) => {
      return acc.flatMap((x) => array.map((y) => [...x, y]));
    },
    [[]] as any[][],
  );

  const allDuplicatedScenarios = combinations.map((combination) => {
    const result: AnyObject = {};
    propertyNames.forEach((prop, index) => {
      result[prop] = combination[index];
    });
    return result;
  });

  return allDuplicatedScenarios
    .map((it) => {
      return {
        vmConfig: it,
        key: JSON.stringify(it),
      };
    })
    .filter((it, i, arr) => {
      return (
        arr.find((l) => l.key === it.key) === it &&
        arr.findLast((l) => l.key === it.key) === it
      );
    });
};

const recursionCases: string[] = [
  '{"wrapViewsInObserver":true,"payloadComputed":true,"comparePayload":"shallow","payloadObservable":"deep"}',
  '{"wrapViewsInObserver":true,"payloadComputed":true,"comparePayload":false,"payloadObservable":"deep"}',
  '{"wrapViewsInObserver":true,"payloadComputed":true,"comparePayload":false,"payloadObservable":"ref"}',
  '{"wrapViewsInObserver":true,"payloadComputed":false,"comparePayload":"shallow","payloadObservable":"deep"}',
  '{"wrapViewsInObserver":true,"payloadComputed":false,"comparePayload":false,"payloadObservable":"deep"}',
  '{"wrapViewsInObserver":true,"payloadComputed":false,"comparePayload":false,"payloadObservable":"ref"}',
  '{"wrapViewsInObserver":false,"payloadComputed":true,"comparePayload":"shallow","payloadObservable":"deep"}',
  '{"wrapViewsInObserver":false,"payloadComputed":true,"comparePayload":false,"payloadObservable":"deep"}',
  '{"wrapViewsInObserver":false,"payloadComputed":true,"comparePayload":false,"payloadObservable":"ref"}',
  '{"wrapViewsInObserver":false,"payloadComputed":false,"comparePayload":"shallow","payloadObservable":"deep"}',
  '{"wrapViewsInObserver":false,"payloadComputed":false,"comparePayload":false,"payloadObservable":"deep"}',
  '{"wrapViewsInObserver":false,"payloadComputed":false,"comparePayload":false,"payloadObservable":"ref"}',
];

export const circularVmPayloadDependencyTestCases: CircularVmPayloadDependencyTestCase[] =
  createAllVmConfigScenarios().map((it) => {
    return {
      vmConfig: it.vmConfig,
      isRecursion: recursionCases.includes(it.key),
    };
  });
