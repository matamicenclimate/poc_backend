import styled from 'styled-components'
import {Button} from '@buffetjs/core'

export const Block = styled.div`
  width: 100%;
  position: relative;
  margin-bottom: 34px;
  background: #ffffff;
  padding: 19px 30px 30px 30px;
  box-shadow: 0 2px 4px 0 #e3e9f3;
  border-radius: 3px;
  line-height: 18px;
  a {
    position: relative;
    text-decoration: none;
    &:hover::after {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      border-radius: 0.3rem;
      content: '';
      opacity: 0.1;
      background: #ffffff;
    }
  }
  h2,
  p {
    line-height: 18px;
  }
  h2 {
    display: inline-block;
  }
  #mainHeader {
    &:after {
      content: '';
      width: 100%;
      height: 3px;
      margin-top: 4px;
      display: block;
      background: #f0b41e;
    }
  }
  .social-wrapper {
    span {
      display: inline-block;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    > div:nth-child(2n) {
      padding-right: 0;
    }
  }
`;

export const Container = styled.div`
  padding: 47px 13px 0 13px;
  > div {
    margin: 0;
  }
`;

export const P = styled.p`
  max-width: 800px;
  padding-top: 12px;
  padding-right: 30px;
  color: #5c5f66;
  font-size: 14px;
  b {
    font-weight: 600;
  }
`;

export const AlgoWalletIMG = styled.img`
  width: 36px;
  height: 36px;
  margin-right: 8px;
`;

export const AlgoWalletButton = styled.button`
  background-color: #e7e7e7;
  border-radius: 4px;
  margin-right: 16px;
  padding: 6px 16px 6px 6px;
`;