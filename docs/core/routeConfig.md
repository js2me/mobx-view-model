# routeConfig

Global route configuration.   
This object contains all global options for some behaviour of route and router instances  

## Basic example

```ts
import { routeConfig, MobxHistory } from "mobx-route";

const yourHistory = new MobxHistory()

routeConfig.update({
  history: yourHistory,
  baseUrl: '/'
});

routeConfig.get();
```

## Fields   

### history  
This is instance of the `MobxHistory` class from [`mobx-location-history` package](https://github.com/js2me/mobx-location-history).  
This class is also can be exported from `mobx-route` package.  

### location  
This is instance of the `MobxLocation` class from [`mobx-location-history` package](https://github.com/js2me/mobx-location-history)  
This class is also can be exported from `mobx-route` package.  

### queryParams  
This is instance of the `QueryParams` class from [`mobx-location-history` package](https://github.com/js2me/mobx-location-history)  
This class is also can be exported from `mobx-route` package.  

### baseUrl
base url for all routes   
