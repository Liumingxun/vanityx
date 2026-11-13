//go:build js && wasm

package main

import (
	"context"
	"unsafe"

	s "github.com/liumingxun/vanityx/pkg/search"

	e "github.com/luxfi/geth/common"
)

// Status codes returned by the exported search function.
const (
	statusFound    = 0
	statusNotFound = 1
	statusError    = 2
)

var (
	// Fixed input buffers let JavaScript write parameters into wasm memory
	// without handing Go a pointer the garbage collector cannot see.
	patternBuf      [512]byte
	deployerBuf     [e.AddressLength]byte
	initcodeHashBuf [e.HashLength]byte

	result []byte
	errMsg []byte
)

// This buffer receives the glob pattern as UTF-8. Write it from JavaScript
// before calling search.
//
//export patternPtr
func patternPtr() uint32 { return bytePtr(patternBuf[:]) }

// This buffer receives the 20-byte CREATE2 deployer address.
//
//export deployerPtr
func deployerPtr() uint32 { return bytePtr(deployerBuf[:]) }

// This buffer receives the 32-byte initcode hash.
//
//export initcodeHashPtr
func initcodeHashPtr() uint32 { return bytePtr(initcodeHashBuf[:]) }

// search runs a single-threaded search over the pattern written to patternBuf.
// It blocks until a match is found or the nonce space is exhausted, so browser
// callers should invoke it from a Web Worker.
//
// On success it returns statusFound and exposes "salt\naddress" through
// resultPtr/resultLen. On failure it returns statusNotFound or statusError,
// with the error text exposed through errorPtr/errorLen.
//
//export search
func search(patternLen int32) int32 {
	result, errMsg = nil, nil
	if patternLen < 0 || int(patternLen) > len(patternBuf) {
		errMsg = []byte("pattern is too long")
		return statusError
	}

	pair, err := s.SearchVanity(context.Background(), &s.Config{
		Pattern:      string(patternBuf[:patternLen]),
		Deployer:     e.Address(deployerBuf),
		InitcodeHash: e.Hash(initcodeHashBuf),
	})

	switch {
	case pair == nil && err == nil:
		return statusNotFound
	case err != nil:
		errMsg = []byte(err.Error())
		return statusError
	}

	result = append(result, pair.Salt()...)
	result = append(result, '\n')
	result = append(result, pair.Address()...)
	return statusFound
}

//export resultPtr
func resultPtr() uint32 { return bytePtr(result) }

//export resultLen
func resultLen() int32 { return int32(len(result)) }

//export errorPtr
func errorPtr() uint32 { return bytePtr(errMsg) }

//export errorLen
func errorLen() int32 { return int32(len(errMsg)) }

func bytePtr(buf []byte) uint32 {
	if len(buf) == 0 {
		return 0
	}
	return uint32(uintptr(unsafe.Pointer(&buf[0])))
}

func main() {}
