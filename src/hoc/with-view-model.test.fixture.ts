import { ViewModelsConfig } from '../config/types.js';

export type CircularVmPayloadDependencyTestCase = {
  vmConfig: Partial<ViewModelsConfig>;
  isRecursion: boolean;
};

export const circularVmPayloadDependencyTestCases: CircularVmPayloadDependencyTestCase[] =
  [
    {
      vmConfig: {},
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: false,
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: false,
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: false,
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'ref',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'ref',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadObservable: 'ref',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'ref',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'shallow',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadObservable: 'shallow',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'shallow',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'struct',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'struct',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'struct',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'struct',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'deep',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadObservable: 'deep',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadObservable: 'deep',
        comparePayload: 'shallow',
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadObservable: 'deep',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: false,
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: false,
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: false,
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: false,
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'ref',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'ref',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'ref',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'ref',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'shallow',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'shallow',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'shallow',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'struct',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'struct',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'struct',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'struct',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'deep',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'deep',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'deep',
        comparePayload: 'shallow',
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: false,
        payloadObservable: 'deep',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: true,
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: false,
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: false,
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: false,
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'ref',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'ref',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'ref',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'ref',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'shallow',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'shallow',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'shallow',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'struct',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'struct',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'struct',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'struct',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'deep',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'deep',
        comparePayload: false,
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'deep',
        comparePayload: 'shallow',
      },
      isRecursion: true,
    },
    {
      vmConfig: {
        payloadComputed: true,
        payloadObservable: 'deep',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: false,
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: false,
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: false,
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'ref',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'ref',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'ref',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'ref',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'shallow',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'shallow',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'shallow',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'struct',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'struct',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'struct',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'struct',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'deep',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'deep',
        comparePayload: false,
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'deep',
        comparePayload: 'shallow',
      },
      isRecursion: false,
    },
    {
      vmConfig: {
        payloadComputed: 'struct',
        payloadObservable: 'deep',
        comparePayload: 'strict',
      },
      isRecursion: false,
    },
  ];
