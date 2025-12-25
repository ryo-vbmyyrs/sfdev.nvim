" Vim syntax file
" Language: Salesforce Apex Debug Log
" Maintainer: ryo-vbmyyrs

if exists("b:current_syntax")
  finish
endif

" Log levels
syntax match apexlogError /\c\<ERROR\>/
syntax match apexlogWarn /\c\<WARN\>/
syntax match apexlogInfo /\c\<INFO\>/
syntax match apexlogDebug /\c\<DEBUG\>/

" Event types
syntax match apexlogEvent /^[A-Z_]\+/
syntax match apexlogCodeUnit /CODE_UNIT_\(STARTED\|FINISHED\)/
syntax match apexlogMethod /METHOD_\(ENTRY\|EXIT\)/
syntax match apexlogSOQL /SOQL_EXECUTE_\(BEGIN\|END\)/
syntax match apexlogDML /DML_\(BEGIN\|END\)/
syntax match apexlogException /\(EXCEPTION_THROWN\|FATAL_ERROR\)/
syntax match apexlogUserDebug /USER_DEBUG/

" Timestamps and numbers
syntax match apexlogTimestamp /(\d\+)/
syntax match apexlogNumber /\<\d\+\>/
syntax match apexlogLineNumber /\[\d\+\]/

" Strings
syntax region apexlogString start=/"/ skip=/\\"/ end=/"/
syntax region apexlogString start=/'/ skip=/\\'/ end=/'/

" Comments and metadata
syntax match apexlogComment /^\/\/.*/
syntax match apexlogPipe /|/

" Highlight definitions
highlight default link apexlogError Error
highlight default link apexlogWarn WarningMsg
highlight default link apexlogInfo Comment
highlight default link apexlogDebug Debug

highlight default link apexlogEvent Type
highlight default link apexlogCodeUnit Function
highlight default link apexlogMethod Function
highlight default link apexlogSOQL Keyword
highlight default link apexlogDML Keyword
highlight default link apexlogException Error
highlight default link apexlogUserDebug Special

highlight default link apexlogTimestamp Number
highlight default link apexlogNumber Number
highlight default link apexlogLineNumber LineNr

highlight default link apexlogString String
highlight default link apexlogComment Comment
highlight default link apexlogPipe Delimiter

let b:current_syntax = "apexlog"
