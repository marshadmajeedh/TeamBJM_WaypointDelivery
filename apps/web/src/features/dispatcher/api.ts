import { ApiResponseSuccess } from '@waypoint/shared';
import { apiRequest } from '../../services/api';

export async function dispatcherApi<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await apiRequest<ApiResponseSuccess<T>>(`/dispatcher${path}`,options);
  return response.data;
}
