# Filtres API

## Usages
### Filters
#### Syntax
`filters[PREFIX + FIELD]=SEARCH`
#### Example
`filters[=subject]=53`
subject field equal to 53
#### Usage
```bash
curl --request GET \
  --url 'http://localhost/search?limit=9999&filters%5B%5Esequence%5D=%2F53%2F&sort%5Bmetadata.createdAt%5D=-1&sort%5Bsubject%5D=1'
  
# limit=9999
# filters[^sequence]=/53/
# sort[metadata.createdAt]=-1
# sort[subject]=1
```
#### List
| Filter | Description           |
|--------|-----------------------|
| :      | Equal                 |
| #      | Number Equal          |
| !#     | Number Not Equal      |
| !:     | Not Equal             |
| \>     | Greater Than          |
| \>|    | Greater Than or Equal |
| \<     | Less Than             |
| \<|    | Less Than or Equal    |
| @      | in                    |
| !@     | not in                |
| @#     | number in             |
| !@#    | number not in         |
| \^     | regex                 |
